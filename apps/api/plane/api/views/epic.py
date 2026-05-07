# Django imports
from django.db.models import Q, Count

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.api.serializers import IssueSerializer
from plane.api.serializers.epic import EpicSerializer, EpicListSerializer
from plane.app.permissions import ProjectEntityPermission
from plane.authentication.session import BaseSessionAuthentication
from plane.db.models import (
    Issue,
    IssueType,
    Project,
    EpicUpdate,
)
from .base import BaseAPIView


class EpicListCreateAPIView(BaseAPIView):
    """
    API Endpoint for creating and listing Epics in a project.
    
    Only returns issues with type='Epic'.
    """
    
    permission_classes = [ProjectEntityPermission]
    serializer_class = EpicSerializer

    def get_queryset(self):
        """Filter to show only epics for this project"""
        project_id = self.kwargs.get("project_id")
        workspace_slug = self.kwargs.get("slug")
        
        epic_type = IssueType.objects.filter(
            workspace__slug=workspace_slug,
            is_epic=True
        ).first()
        
        if not epic_type:
            return Issue.objects.none()
        
        return Issue.objects.filter(
            type=epic_type,
            project_id=project_id,
            workspace__slug=workspace_slug
        ).order_by("-created_at")

    def get(self, request, slug, project_id):
        """List all Epics in the project"""
        try:
            queryset = self.get_queryset()
            serializer = EpicListSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request, slug, project_id):
        """Create a new Epic"""
        try:
            project = Project.objects.get(pk=project_id, workspace__slug=slug)
            
            # Ensure Epic IssueType exists
            epic_type = IssueType.objects.filter(
                workspace=project.workspace,
                is_epic=True
            ).first()
            
            if not epic_type:
                return Response(
                    {"error": "Epic type not configured in workspace"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = EpicSerializer(
                data=request.data,
                context={
                    "request": request,
                    "project": project,
                    "workspace": project.workspace
                }
            )
            
            if serializer.is_valid():
                # Force set the epic type, project, and created_by
                epic = serializer.save(
                    type=epic_type,
                    project=project,
                    workspace=project.workspace,
                    created_by=request.user
                )
                
                # Handle assignees if provided
                assignees = request.data.get("assignees", [])
                if assignees:
                    from plane.db.models import IssueAssignee
                    for assignee_id in assignees:
                        try:
                            IssueAssignee.objects.create(
                                issue=epic,
                                assignee_id=assignee_id
                            )
                        except Exception:
                            pass
                
                return Response(
                    EpicSerializer(epic).data,
                    status=status.HTTP_201_CREATED
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class EpicDetailAPIView(BaseAPIView):
    """
    API Endpoint for retrieving, updating, and deleting a specific Epic.
    """
    
    permission_classes = [ProjectEntityPermission]
    serializer_class = EpicSerializer

    def get_epic(self, slug, project_id, epic_id):
        """Get the epic object"""
        epic_type = IssueType.objects.filter(
            workspace__slug=slug,
            is_epic=True
        ).first()
        
        if not epic_type:
            return None
        
        return Issue.objects.filter(
            id=epic_id,
            type=epic_type,
            project_id=project_id,
            workspace__slug=slug
        ).first()

    def get(self, request, slug, project_id, epic_id):
        """Get an Epic"""
        try:
            epic = self.get_epic(slug, project_id, epic_id)
            if not epic:
                return Response(
                    {"error": "Epic not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = EpicSerializer(epic)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def patch(self, request, slug, project_id, epic_id):
        """Update an Epic"""
        try:
            epic = self.get_epic(slug, project_id, epic_id)
            if not epic:
                return Response(
                    {"error": "Epic not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = EpicSerializer(
                epic,
                data=request.data,
                partial=True,
                context={
                    "request": request,
                    "project": epic.project,
                }
            )
            
            if serializer.is_valid():
                serializer.save(updated_by=request.user)
                
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, slug, project_id, epic_id):
        """Delete an Epic"""
        try:
            epic = self.get_epic(slug, project_id, epic_id)
            if not epic:
                return Response(
                    {"error": "Epic not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            epic.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class EpicIssuesAPIView(BaseAPIView):
    """
    API Endpoint for listing issues under an Epic.
    """
    
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id, epic_id):
        """Get all issues linked to an epic"""
        try:
            epic_type = IssueType.objects.filter(
                workspace__slug=slug,
                is_epic=True
            ).first()
            
            if not epic_type:
                return Response(
                    {"error": "Epic type not configured"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            epic = Issue.objects.filter(
                id=epic_id,
                type=epic_type,
                project_id=project_id,
                workspace__slug=slug
            ).first()
            
            if not epic:
                return Response(
                    {"error": "Epic not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all issues (non-epics) linked to this epic
            issues = Issue.objects.filter(
                parent=epic,
            ).exclude(type=epic_type).order_by("-created_at")
            
            serializer = IssueSerializer(issues, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class EpicProgressAPIView(BaseAPIView):
    """
    GET /epics/{epic_id}/progress/
    Returns aggregated progress of all child issues grouped by state group.
    """

    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id, epic_id):
        try:
            epic_type = IssueType.objects.filter(workspace__slug=slug, is_epic=True).first()
            if not epic_type:
                return Response({"error": "Epic type not configured"}, status=status.HTTP_400_BAD_REQUEST)

            epic = Issue.objects.filter(
                id=epic_id, type=epic_type, project_id=project_id, workspace__slug=slug
            ).first()
            if not epic:
                return Response({"error": "Epic not found"}, status=status.HTTP_404_NOT_FOUND)

            children = Issue.objects.filter(
                parent=epic, deleted_at__isnull=True
            ).exclude(type=epic_type)

            total = children.count()
            group_counts = {
                "backlog": children.filter(state__group="backlog").count(),
                "unstarted": children.filter(state__group="unstarted").count(),
                "started": children.filter(state__group="started").count(),
                "completed": children.filter(state__group="completed").count(),
                "cancelled": children.filter(state__group="cancelled").count(),
            }
            completed_and_cancelled = group_counts["completed"] + group_counts["cancelled"]
            percentage = round((completed_and_cancelled / total) * 100) if total > 0 else 0

            return Response(
                {
                    "epic_id": str(epic_id),
                    "total": total,
                    "percentage": percentage,
                    "breakdown": group_counts,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EpicUpdateAPIView(BaseAPIView):
    """
    GET  /epics/{epic_id}/updates/  — list updates newest-first
    POST /epics/{epic_id}/updates/  — add a new update { status, comment }
    """

    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [ProjectEntityPermission]

    def _get_epic(self, slug, project_id, epic_id):
        epic_type = IssueType.objects.filter(workspace__slug=slug, is_epic=True).first()
        if not epic_type:
            return None
        return Issue.objects.filter(
            id=epic_id, type=epic_type, project_id=project_id, workspace__slug=slug
        ).first()

    def get(self, request, slug, project_id, epic_id):
        epic = self._get_epic(slug, project_id, epic_id)
        if not epic:
            return Response({"error": "Epic not found"}, status=status.HTTP_404_NOT_FOUND)

        updates = EpicUpdate.objects.filter(epic=epic).select_related("created_by")
        data = [
            {
                "id": str(u.id),
                "status": u.status,
                "comment": u.comment,
                "created_at": u.created_at,
                "created_by": str(u.created_by_id) if u.created_by_id else None,
                "created_by_display_name": u.created_by.display_name if u.created_by else None,
            }
            for u in updates
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, slug, project_id, epic_id):
        epic = self._get_epic(slug, project_id, epic_id)
        if not epic:
            return Response({"error": "Epic not found"}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get("status", "on_track")
        if status_value not in ("on_track", "at_risk", "off_track"):
            return Response(
                {"error": "status must be one of: on_track, at_risk, off_track"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update = EpicUpdate.objects.create(
            epic=epic,
            status=status_value,
            comment=request.data.get("comment", ""),
            created_by=request.user,
        )
        return Response(
            {
                "id": str(update.id),
                "status": update.status,
                "comment": update.comment,
                "created_at": update.created_at,
                "created_by": str(update.created_by_id),
            },
            status=status.HTTP_201_CREATED,
        )
