#!/bin/bash

# Plane Health Check Script - Fixed for 404 responses
# Accepts any HTTP response as "healthy" (not just 2xx)
# Works when run as rsoni OR as root (always runs apps as rsoni)

set -e

# ============================================================
# CONFIGURATION
# ============================================================
PLANE_ROOT="/home/rsoni/Plane-Deployment/Docker-Based/plane"
PLANE_USER="rsoni"
SERVER_IP="16.112.2.185"
LOG_FILE="/home/rsoni/Plane-Deployment/Docker-Based/plane-health.log"

CURRENT_USER="$(whoami)"

# DRY-RUN MODE
DRY_RUN="${DRY_RUN:-false}"
if [[ "$1" == "--dry-run" ]] || [[ "$1" == "-d" ]]; then
  DRY_RUN="true"
fi

# ============================================================
# COLORS & LOGGING
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()       { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$LOG_FILE"; }
log_success(){ echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$LOG_FILE"; }
log_warning(){ echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$LOG_FILE"; }
log_info()  { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ $1${NC}" | tee -a "$LOG_FILE"; }
log_dryrun(){ echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] [DRY-RUN] $1${NC}" | tee -a "$LOG_FILE"; }

# Helper to run commands as PLANE_USER (works for both root and rsoni)
run_as_plane_user() {
  local cmd="$1"
  if [ "$CURRENT_USER" = "$PLANE_USER" ]; then
    bash -c "$cmd"
  else
    sudo -u "$PLANE_USER" bash -c "$cmd"
  fi
}

# ============================================================
# HEALTH CHECK FUNCTIONS
# ============================================================

check_http_endpoints() {
  log_info "Checking HTTP endpoints..."

  local all_ok=true
  declare -A endpoints=(
    ["API"]="8000"
    ["Web"]="3000"
    ["Admin"]="3001"
    ["Space"]="3002"
    ["Live"]="3100"
  )

  declare -A endpoint_status

  for name in "${!endpoints[@]}"; do
    port="${endpoints[$name]}"

    # Any HTTP response code (including 404/500) is considered "responding"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:$port" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "" ]; then
      log_success "$name (port $port) is responding (HTTP $HTTP_CODE)"
      endpoint_status[$port]="ok"
    else
      log_error "$name (port $port) not responding (connection failed)"
      endpoint_status[$port]="down"
      all_ok=false
    fi
  done

  # Export status
  export WEB_OK="${endpoint_status[3000]}"
  export ADMIN_OK="${endpoint_status[3001]}"
  export SPACE_OK="${endpoint_status[3002]}"
  export LIVE_OK="${endpoint_status[3100]}"
  export API_OK="${endpoint_status[8000]}"

  $all_ok && return 0 || return 1
}

check_docker_services() {
  log_info "Checking Docker backend services..."

  cd "$PLANE_ROOT" || exit 1

  local docker_ok=true

  CONTAINERS=$(docker compose -f docker-compose-local.yml ps -q 2>/dev/null)
  if [ -z "$CONTAINERS" ]; then
    log_error "Docker containers not running"
    return 1
  fi

  local running_count=0
  for container in $CONTAINERS; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
    if [ "$STATUS" = "running" ]; then
      ((running_count++))
    else
      CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$container" 2>/dev/null | sed 's#^/##')
      log_error "Container $CONTAINER_NAME is $STATUS"
      docker_ok=false
    fi
  done

  log_success "$running_count Docker containers running"

  # PostgreSQL
  POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --filter "name=plane-db" -q | head -n1)
  if [ -n "$POSTGRES_CONTAINER" ]; then
    if docker exec "$POSTGRES_CONTAINER" pg_isready 2>/dev/null | grep -q "accepting connections"; then
      log_success "PostgreSQL is ready"
    else
      log_error "PostgreSQL not responding"
      docker_ok=false
    fi
  else
    log_error "PostgreSQL container not found"
    docker_ok=false
  fi

  # Redis
  REDIS_CONTAINER=$(docker ps --filter "name=redis" --filter "name=plane-redis" -q | head -n1)
  if [ -n "$REDIS_CONTAINER" ]; then
    if docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; then
      log_success "Redis is ready"
    else
      log_error "Redis not responding"
      docker_ok=false
    fi
  else
    log_error "Redis container not found"
    docker_ok=false
  fi

  $docker_ok && return 0 || return 1
}

check_frontend_processes() {
  log_info "Checking frontend processes (user: $PLANE_USER)..."

  if pgrep -u "$PLANE_USER" -f "next-server" > /dev/null; then
    local process_count
    process_count=$(pgrep -u "$PLANE_USER" -f "next-server" | wc -l)
    log_success "Found $process_count next-server processes for user $PLANE_USER"
    return 0
  else
    log_error "No next-server processes found for user $PLANE_USER"
    return 1
  fi
}

# ============================================================
# FIX FUNCTIONS
# ============================================================

fix_docker_services() {
  if [ "$DRY_RUN" = "true" ]; then
    log_dryrun "Would restart Docker containers"
    log_dryrun "  docker compose down && docker compose up -d"
    log_dryrun "  Expected downtime: ~30-45 seconds"
    return 0
  fi

  log_warning "Restarting Docker backend services..."

  cd "$PLANE_ROOT" || exit 1

  docker compose -f docker-compose-local.yml down
  sleep 3
  docker compose -f docker-compose-local.yml up -d
  sleep 15

  local attempts=0
  while [ $attempts -lt 30 ]; do
    if check_docker_services 2>/dev/null; then
      break
    fi
    sleep 5
    ((attempts++))
  done

  log_success "Docker services restarted"
}

fix_frontend_app() {
  local app_name=$1
  local app_port=$2
  local app_dir=$3

  if [ "$DRY_RUN" = "true" ]; then
    log_dryrun "Would restart frontend app: $app_name"
    log_dryrun "  As user: $PLANE_USER"
    log_dryrun "  Directory: $PLANE_ROOT/apps/$app_dir"
    log_dryrun "  Kill existing process on port $app_port"
    log_dryrun "  Start: pnpm start (as $PLANE_USER)"
    log_dryrun "  Expected downtime: ~10-15 seconds"
    return 0
  fi

  log_warning "Restarting frontend app: $app_name (as user $PLANE_USER)"

  # Kill existing process on port (works for both root and rsoni on own processes)
  log "Stopping process on port $app_port..."
  fuser -k $app_port/tcp 2>/dev/null || true
  sleep 3

  log "Starting $app_name as user $PLANE_USER..."

  if [ "$app_name" = "web" ]; then
    run_as_plane_user "cd $PLANE_ROOT/apps/$app_dir && nohup pnpm start > /tmp/$app_name.log 2>&1 &"
  elif [ "$app_name" = "admin" ]; then
    run_as_plane_user "cd $PLANE_ROOT/apps/$app_dir && PORT=3001 nohup pnpm start > /tmp/$app_name.log 2>&1 &"
  elif [ "$app_name" = "space" ]; then
    run_as_plane_user "cd $PLANE_ROOT/apps/$app_dir && PORT=3002 nohup pnpm start > /tmp/$app_name.log 2>&1 &"
  elif [ "$app_name" = "live" ]; then
    run_as_plane_user "cd $PLANE_ROOT/apps/$app_dir && nohup pnpm dev > /tmp/$app_name.log 2>&1 &"
  fi

  sleep 10
  log_success "Frontend app $app_name restarted"
}

cleanup_pm2_conflicts() {
  log_info "Checking for PM2 conflicts..."

  if ! command -v pm2 &> /dev/null; then
    return 0
  fi

  if ! pm2 jlist 2>/dev/null | grep -q '"restart_time"'; then
    log_success "No PM2 conflicts detected"
    return 0
  fi

  local has_loops=false
  for app in web admin space; do
    if pm2 jlist 2>/dev/null | grep -q "\"name\":\"$app\""; then
      local restarts
      restarts=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name==\"$app\") | .pm2_env.restart_time" 2>/dev/null || echo "0")
      if [ "$restarts" -gt 50 ]; then
        log_warning "PM2 process '$app' has $restarts restarts (likely port conflict)"
        has_loops=true
      fi
    fi
  done

  if [ "$has_loops" = true ]; then
    if [ "$DRY_RUN" = "true" ]; then
      log_dryrun "Would stop conflicting PM2 processes"
      log_dryrun "  pm2 stop web admin space"
      log_dryrun "  pm2 delete web admin space"
    else
      log_warning "Stopping conflicting PM2 processes..."
      pm2 stop web admin space 2>/dev/null || true
      pm2 delete web admin space 2>/dev/null || true
      log_success "Conflicting PM2 processes stopped"
    fi
  else
    log_success "No PM2 conflicts detected"
  fi
}

# ============================================================
# MAIN LOGIC
# ============================================================

main() {
  if [ "$DRY_RUN" = "true" ]; then
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}   DRY-RUN MODE ENABLED${NC}"
    echo -e "${CYAN}   No changes will be made${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
  fi

  log "========================================="
  log "Plane Health Check Started $([ "$DRY_RUN" = "true" ] && echo "(DRY-RUN)" || echo "")"
  log "========================================="

  cleanup_pm2_conflicts

  local endpoints_ok=true
  if ! check_http_endpoints; then
    endpoints_ok=false
  fi

  if [ "$endpoints_ok" = true ]; then
    log "========================================="
    log_success "All HTTP endpoints responding - System is healthy!"
    log "========================================="
    if [ "$DRY_RUN" = "true" ]; then
      log_dryrun "In normal mode, would exit here with no changes"
    fi
    exit 0
  fi

  log_warning "Some endpoints down, investigating..."

  local docker_ok=true
  local frontend_ok=true

  if ! check_docker_services; then
    docker_ok=false
  fi

  if ! check_frontend_processes; then
    frontend_ok=false
  fi

  log "========================================="
  log "Analysis:"
  log "  - HTTP Endpoints: $([ "$endpoints_ok" = true ] && echo 'ALL OK' || echo 'SOME DOWN')"
  log "  - Docker Services: $([ "$docker_ok" = true ] && echo 'OK' || echo 'ISSUES')"
  log "  - Frontend Processes: $([ "$frontend_ok" = true ] && echo 'OK' || echo 'ISSUES')"
  log "========================================="

  if [ "$DRY_RUN" = "true" ]; then
    echo ""
    log_dryrun "========================================="
    log_dryrun "ACTION PLAN:"
    log_dryrun "========================================="
  fi

  local needs_fix=false

  if [ "$docker_ok" = false ]; then
    needs_fix=true
    if [ "$DRY_RUN" = "true" ]; then
      log_dryrun "Docker issues detected - WOULD restart Docker services"
    else
      fix_docker_services
      sleep 10
    fi
  fi

  if [ "$endpoints_ok" = false ]; then
    needs_fix=true

    if [ "$WEB_OK" != "ok" ]; then
      fix_frontend_app "web" "3000" "web"
    fi
    if [ "$ADMIN_OK" != "ok" ]; then
      fix_frontend_app "admin" "3001" "admin"
    fi
    if [ "$SPACE_OK" != "ok" ]; then
      fix_frontend_app "space" "3002" "space"
    fi
    if [ "$LIVE_OK" != "ok" ]; then
      fix_frontend_app "live" "3100" "live"
    fi

    sleep 10
  fi

  if [ "$DRY_RUN" = "true" ]; then
    log_dryrun "========================================="
    log_dryrun "After fixes, WOULD recheck all endpoints"
    log_dryrun "========================================="
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}DRY-RUN COMPLETE${NC}"
    echo -e "${CYAN}No changes were made${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
    echo "To run for real:"
    echo "  ./plane-health-check.sh"
  else
    if [ "$needs_fix" = true ]; then
      log "========================================="
      log "Final verification..."
      log "========================================="
      sleep 30
      check_http_endpoints
    fi
    log "========================================="
    log "Health check complete"
    log "========================================="
  fi
}

if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  echo "Plane Health Check Script - Fixed for 404 responses"
  echo ""
  echo "Usage:"
  echo "  $0             Run health check and fix issues"
  echo "  $0 --dry-run   Preview what would happen"
  echo "  $0 -d          Same as --dry-run"
  echo "  $0 --help      Show this help"
  echo ""
  echo "Runs correctly when executed as user '$PLANE_USER' or as root."
  echo "All frontend apps are (re)started under user '$PLANE_USER'."
  echo ""
  exit 0
fi

main
