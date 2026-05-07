from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import allow_permission, ROLE
from plane.app.serializers.base import BaseSerializer, DynamicBaseSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import IssueType, ProjectIssueType, Workspace
from rest_framework import serializers


class IssueTypeSerializer(BaseSerializer):
    project_ids = serializers.SerializerMethodField()

    class Meta:
        model = IssueType
        fields = [
            "id", "name", "description", "logo_props",
            "is_epic", "is_default", "is_active", "level",
            "workspace", "created_at", "updated_at", "project_ids",
        ]
        read_only_fields = ["id", "workspace", "created_at", "updated_at"]

    def get_project_ids(self, obj):
        return list(
            obj.project_issue_types.filter(deleted_at__isnull=True)
            .values_list("project_id", flat=True)
        )


class WorkspaceWorkItemTypeEndpoint(BaseAPIView):
    """Workspace-level work item type CRUD — POST /workspaces/<slug>/work-item-types/"""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, pk=None):
        if pk:
            try:
                issue_type = IssueType.objects.get(workspace__slug=slug, pk=pk, is_active=True)
                return Response(IssueTypeSerializer(issue_type).data, status=status.HTTP_200_OK)
            except IssueType.DoesNotExist:
                return Response({"error": "Work item type not found."}, status=status.HTTP_404_NOT_FOUND)

        types = IssueType.objects.filter(workspace__slug=slug, is_active=True).order_by("level", "name")
        return Response(IssueTypeSerializer(types, many=True).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        # Prevent duplicate active type names in same workspace
        if IssueType.objects.filter(
            workspace=workspace,
            name__iexact=request.data.get("name", "").strip(),
            is_active=True,
        ).exists():
            return Response(
                {"error": f"A work item type named '{request.data.get('name')}' already exists in this workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = IssueTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def patch(self, request, slug, pk):
        try:
            issue_type = IssueType.objects.get(workspace__slug=slug, pk=pk)
        except IssueType.DoesNotExist:
            return Response({"error": "Work item type not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = IssueTypeSerializer(issue_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def delete(self, request, slug, pk):
        try:
            issue_type = IssueType.objects.get(workspace__slug=slug, pk=pk)
        except IssueType.DoesNotExist:
            return Response({"error": "Work item type not found."}, status=status.HTTP_404_NOT_FOUND)

        # Soft delete
        issue_type.is_active = False
        issue_type.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectWorkItemTypeEndpoint(BaseAPIView):
    """Assign / list IssueTypes for a project — POST /workspaces/<slug>/projects/<id>/work-item-types/"""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="PROJECT")
    def get(self, request, slug, project_id):
        types = IssueType.objects.filter(
            workspace__slug=slug,
            project_issue_types__project_id=project_id,
            project_issue_types__deleted_at__isnull=True,
            is_active=True,
        ).order_by("level", "name")
        return Response(IssueTypeSerializer(types, many=True).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def post(self, request, slug, project_id):
        """Assign a workspace type to a project. Payload: { "type_id": "<uuid>" }"""
        type_id = request.data.get("type_id")
        if not type_id:
            return Response({"error": "type_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            issue_type = IssueType.objects.get(workspace__slug=slug, pk=type_id, is_active=True)
        except IssueType.DoesNotExist:
            return Response({"error": "Work item type not found."}, status=status.HTTP_404_NOT_FOUND)

        obj, created = ProjectIssueType.objects.get_or_create(
            project_id=project_id,
            issue_type=issue_type,
            defaults={"deleted_at": None},
        )
        if not created and obj.deleted_at:
            # Re-activate a previously removed type
            obj.deleted_at = None
            obj.save(update_fields=["deleted_at"])

        return Response(IssueTypeSerializer(issue_type).data, status=status.HTTP_201_CREATED)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def delete(self, request, slug, project_id, type_id):
        """Remove a type from a project (soft-delete ProjectIssueType)."""
        from django.utils import timezone
        try:
            link = ProjectIssueType.objects.get(
                project_id=project_id,
                issue_type__workspace__slug=slug,
                issue_type_id=type_id,
                deleted_at__isnull=True,
            )
        except ProjectIssueType.DoesNotExist:
            return Response({"error": "Type not assigned to this project."}, status=status.HTTP_404_NOT_FOUND)
        link.deleted_at = timezone.now()
        link.save(update_fields=["deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
