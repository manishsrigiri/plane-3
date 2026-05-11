from django.db.models import Count, Q, Sum, Case, When, IntegerField

from rest_framework import status
from rest_framework.response import Response

from plane.app.views.base import BaseAPIView
from plane.app.permissions import allow_permission, ROLE
from plane.app.serializers import InitiativeSerializer, InitiativeListSerializer, InitiativeEpicSerializer
from plane.db.models import Initiative, InitiativeEpic, Issue, Workspace, Project


def _progress_annotations():
    """Shared annotations for initiative progress."""
    return {
        "epic_count": Count("initiative_epics", distinct=True),
        "completed_epic_count": Count(
            "initiative_epics",
            filter=Q(initiative_epics__epic__state__group__in=["completed", "cancelled"]),
            distinct=True,
        ),
    }


class InitiativeViewSet(BaseAPIView):

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, pk=None):
        if pk:
            try:
                initiative = (
                    Initiative.objects.filter(workspace__slug=slug, pk=pk, archived_at__isnull=True)
                    .annotate(**_progress_annotations())
                    .get()
                )
                serializer = InitiativeSerializer(initiative)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Initiative.DoesNotExist:
                return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        # Filters
        status_filter = request.query_params.get("status")
        owner_filter = request.query_params.get("owner")

        initiatives = Initiative.objects.filter(
            workspace__slug=slug, archived_at__isnull=True
        ).annotate(**_progress_annotations())

        if status_filter:
            initiatives = initiatives.filter(status=status_filter)
        if owner_filter:
            initiatives = initiatives.filter(owner_id=owner_filter)

        serializer = InitiativeListSerializer(initiatives.order_by("sort_order"), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = InitiativeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def patch(self, request, slug, pk):
        try:
            initiative = Initiative.objects.get(workspace__slug=slug, pk=pk)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = InitiativeSerializer(initiative, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def delete(self, request, slug, pk):
        try:
            initiative = Initiative.objects.get(workspace__slug=slug, pk=pk)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)
        initiative.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InitiativeEpicViewSet(BaseAPIView):

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, initiative_id):
        try:
            Initiative.objects.get(workspace__slug=slug, pk=initiative_id)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        epic_links = InitiativeEpic.objects.filter(
            initiative_id=initiative_id
        ).select_related("epic", "epic__project")
        serializer = InitiativeEpicSerializer(epic_links, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug, initiative_id):
        """Attach one or more epics to an Initiative.
        Payload: { "epic_ids": ["uuid", ...] }
        Each epic can only belong to one Initiative — duplicates are rejected.
        """
        try:
            initiative = Initiative.objects.get(workspace__slug=slug, pk=initiative_id)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        epic_ids = request.data.get("epic_ids", [])
        if not epic_ids:
            return Response({"error": "epic_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate epics exist and are actual epics in this workspace
        epics = Issue.objects.filter(
            id__in=epic_ids,
            type__is_epic=True,
            workspace__slug=slug,
        )
        if epics.count() != len(epic_ids):
            return Response(
                {"error": "One or more epic IDs are invalid or not epics."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if any epic is already attached to another initiative
        already_linked = InitiativeEpic.objects.filter(epic_id__in=epic_ids).exclude(
            initiative_id=initiative_id
        )
        if already_linked.exists():
            conflicting = list(already_linked.values_list("epic_id", flat=True))
            return Response(
                {
                    "error": "Some epics are already attached to another initiative.",
                    "conflicting_epic_ids": [str(i) for i in conflicting],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for epic in epics:
            obj, _ = InitiativeEpic.objects.get_or_create(
                initiative=initiative, epic=epic
            )
            created.append(obj)

        serializer = InitiativeEpicSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def delete(self, request, slug, initiative_id, epic_id):
        """Detach an epic from an Initiative without deleting the Epic."""
        try:
            link = InitiativeEpic.objects.get(
                initiative__workspace__slug=slug,
                initiative_id=initiative_id,
                epic_id=epic_id,
            )
        except InitiativeEpic.DoesNotExist:
            return Response({"error": "Epic not linked to this initiative."}, status=status.HTTP_404_NOT_FOUND)
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectInitiativeViewSet(BaseAPIView):
    """Project-scoped initiative CRUD — /workspaces/<slug>/projects/<project_id>/initiatives/"""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="PROJECT")
    def get(self, request, slug, project_id, pk=None):
        if pk:
            try:
                initiative = (
                    Initiative.objects.filter(
                        workspace__slug=slug, project_id=project_id, pk=pk, archived_at__isnull=True
                    )
                    .annotate(**_progress_annotations())
                    .get()
                )
                serializer = InitiativeSerializer(initiative)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Initiative.DoesNotExist:
                return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        status_filter = request.query_params.get("status")
        owner_filter = request.query_params.get("owner")

        initiatives = Initiative.objects.filter(
            workspace__slug=slug, project_id=project_id, archived_at__isnull=True
        ).annotate(**_progress_annotations())

        if status_filter:
            initiatives = initiatives.filter(status=status_filter)
        if owner_filter:
            initiatives = initiatives.filter(owner_id=owner_filter)

        serializer = InitiativeListSerializer(initiatives.order_by("sort_order"), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def post(self, request, slug, project_id):
        workspace = Workspace.objects.get(slug=slug)
        try:
            project = Project.objects.get(workspace=workspace, pk=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = InitiativeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace, project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def patch(self, request, slug, project_id, pk):
        try:
            initiative = Initiative.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = InitiativeSerializer(initiative, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="PROJECT")
    def delete(self, request, slug, project_id, pk):
        try:
            initiative = Initiative.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        except Initiative.DoesNotExist:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)
        initiative.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectInitiativeEpicViewSet(BaseAPIView):
    """Project-scoped initiative epics — /workspaces/<slug>/projects/<project_id>/initiatives/<initiative_id>/epics/"""

    def _get_initiative(self, slug, project_id, initiative_id):
        try:
            return Initiative.objects.get(workspace__slug=slug, project_id=project_id, pk=initiative_id)
        except Initiative.DoesNotExist:
            return None

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="PROJECT")
    def get(self, request, slug, project_id, initiative_id):
        if not self._get_initiative(slug, project_id, initiative_id):
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        epic_links = InitiativeEpic.objects.filter(
            initiative_id=initiative_id
        ).select_related("epic", "epic__project")
        serializer = InitiativeEpicSerializer(epic_links, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def post(self, request, slug, project_id, initiative_id):
        initiative = self._get_initiative(slug, project_id, initiative_id)
        if not initiative:
            return Response({"error": "Initiative not found."}, status=status.HTTP_404_NOT_FOUND)

        epic_ids = request.data.get("epic_ids", [])
        if not epic_ids:
            return Response({"error": "epic_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate epics exist, are actual epics, and belong to the same project
        epics = Issue.objects.filter(
            id__in=epic_ids,
            type__is_epic=True,
            workspace__slug=slug,
            project_id=project_id,
        )
        if epics.count() != len(epic_ids):
            return Response(
                {"error": "One or more epic IDs are invalid, not epics, or belong to a different project."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        already_linked = InitiativeEpic.objects.filter(epic_id__in=epic_ids).exclude(initiative_id=initiative_id)
        if already_linked.exists():
            conflicting = list(already_linked.values_list("epic_id", flat=True))
            return Response(
                {
                    "error": "Some epics are already attached to another initiative.",
                    "conflicting_epic_ids": [str(i) for i in conflicting],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for epic in epics:
            obj, _ = InitiativeEpic.objects.get_or_create(initiative=initiative, epic=epic)
            created.append(obj)

        serializer = InitiativeEpicSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def delete(self, request, slug, project_id, initiative_id, epic_id):
        try:
            link = InitiativeEpic.objects.get(
                initiative__workspace__slug=slug,
                initiative__project_id=project_id,
                initiative_id=initiative_id,
                epic_id=epic_id,
            )
        except InitiativeEpic.DoesNotExist:
            return Response({"error": "Epic not linked to this initiative."}, status=status.HTTP_404_NOT_FOUND)
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
