from rest_framework import status, serializers
from rest_framework.response import Response

from plane.app.permissions import allow_permission, ROLE
from plane.app.serializers.base import BaseSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import (
    CustomProperty, IssueCustomPropertyValue, IssueType, Workspace,
    Estimate, EstimatePoint, Project,
)


class CustomPropertySerializer(BaseSerializer):
    class Meta:
        model = CustomProperty
        fields = "__all__"
        read_only_fields = ["id", "workspace", "created_at", "updated_at", "created_by", "updated_by"]


class IssueCustomPropertyValueSerializer(BaseSerializer):
    class Meta:
        model = IssueCustomPropertyValue
        fields = "__all__"
        read_only_fields = ["id", "issue", "property", "created_at", "updated_at", "created_by", "updated_by"]


class CustomPropertyEndpoint(BaseAPIView):
    """CRUD for custom properties bound to an IssueType."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, pk=None):
        type_id = request.query_params.get("type_id")
        qs = CustomProperty.objects.filter(workspace__slug=slug, is_active=True)
        if type_id:
            qs = qs.filter(issue_type_id=type_id)
        if pk:
            try:
                prop = qs.get(pk=pk)
                return Response(CustomPropertySerializer(prop).data, status=status.HTTP_200_OK)
            except CustomProperty.DoesNotExist:
                return Response({"error": "Property not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CustomPropertySerializer(qs.order_by("sort_order"), many=True).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = CustomPropertySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def patch(self, request, slug, pk):
        try:
            prop = CustomProperty.objects.get(workspace__slug=slug, pk=pk)
        except CustomProperty.DoesNotExist:
            return Response({"error": "Property not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CustomPropertySerializer(prop, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def delete(self, request, slug, pk):
        try:
            prop = CustomProperty.objects.get(workspace__slug=slug, pk=pk)
        except CustomProperty.DoesNotExist:
            return Response({"error": "Property not found."}, status=status.HTTP_404_NOT_FOUND)
        prop.is_active = False
        prop.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueCustomPropertyValueEndpoint(BaseAPIView):
    """Read/write custom property values for a specific issue."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="PROJECT")
    def get(self, request, slug, project_id, issue_id):
        values = IssueCustomPropertyValue.objects.filter(
            issue_id=issue_id,
            issue__project_id=project_id,
            issue__workspace__slug=slug,
        ).select_related("property")
        return Response(IssueCustomPropertyValueSerializer(values, many=True).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def post(self, request, slug, project_id, issue_id):
        """Upsert: { "property_id": "<uuid>", "value_text": "<html or text>" }"""
        property_id = request.data.get("property_id")
        value_text = request.data.get("value_text", "")
        if not property_id:
            return Response({"error": "property_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            prop = CustomProperty.objects.get(workspace__slug=slug, pk=property_id, is_active=True)
        except CustomProperty.DoesNotExist:
            return Response({"error": "Property not found."}, status=status.HTTP_404_NOT_FOUND)

        obj, _ = IssueCustomPropertyValue.objects.update_or_create(
            issue_id=issue_id,
            property=prop,
            defaults={"value_text": value_text},
        )
        return Response(IssueCustomPropertyValueSerializer(obj).data, status=status.HTTP_200_OK)


# ── Fibonacci estimate auto-setup ──────────────────────────────────────────────
FIBONACCI_SEQUENCE = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"]


class FibonacciEstimateSetupEndpoint(BaseAPIView):
    """
    POST /workspaces/<slug>/projects/<project_id>/setup-fibonacci-estimate/
    Creates a Fibonacci estimate for the project and sets it as the active estimate.
    Idempotent — safe to call multiple times.
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="PROJECT")
    def post(self, request, slug, project_id):
        project = Project.objects.get(workspace__slug=slug, pk=project_id)

        # Check if a Fibonacci estimate already exists
        existing = Estimate.objects.filter(
            project=project, name="Story Points (Fibonacci)"
        ).first()
        if existing:
            if project.estimate_id != existing.id:
                project.estimate = existing
                project.save(update_fields=["estimate"])
            return Response(
                {"detail": "Fibonacci estimate already configured.", "estimate_id": str(existing.id)},
                status=status.HTTP_200_OK,
            )

        estimate = Estimate.objects.create(
            project=project,
            workspace=project.workspace,
            name="Story Points (Fibonacci)",
            type="categories",
            last_used=True,
        )

        EstimatePoint.objects.bulk_create([
            EstimatePoint(
                estimate=estimate,
                project=project,
                workspace=project.workspace,
                key=idx,
                value=value,
                description=f"Story point: {value}",
            )
            for idx, value in enumerate(FIBONACCI_SEQUENCE)
        ])

        project.estimate = estimate
        project.save(update_fields=["estimate"])

        return Response(
            {"detail": "Fibonacci estimate configured.", "estimate_id": str(estimate.id)},
            status=status.HTTP_201_CREATED,
        )
