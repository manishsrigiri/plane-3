import time
from django.core.management.base import BaseCommand
from django.db.migrations.executor import MigrationExecutor
from django.db import connections, DEFAULT_DB_ALIAS


class Command(BaseCommand):
    help = "Wait for database migrations to complete before starting Celery worker/beat"

    def handle(self, *args, **kwargs):
        while True:
            try:
                if not self._pending_migrations():
                    break
                self.stdout.write("Waiting for database migrations to complete...")
            except Exception as e:
                self.stdout.write(f"Database not ready yet ({e}), retrying in 5 seconds...")
            time.sleep(5)

        self.stdout.write(self.style.SUCCESS("No migrations pending. Starting processes..."))

    def _pending_migrations(self):
        connection = connections[DEFAULT_DB_ALIAS]
        connection.ensure_connection()
        executor = MigrationExecutor(connection)
        targets = executor.loader.graph.leaf_nodes()
        return bool(executor.migration_plan(targets))
