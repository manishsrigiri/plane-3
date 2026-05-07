from rest_framework import serializers

from plane.db.models import Initiative, InitiativeEpic, Issue
from plane.app.serializers.base import BaseSerializer, DynamicBaseSerializer
from plane.app.serializers.user import UserLiteSerializer


class InitiativeSerializer(BaseSerializer):
    owner_detail = UserLiteSerializer(source="owner", read_only=True)
    epic_count = serializers.IntegerField(read_only=True)
    completed_epic_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Initiative
        fields = "__all__"
        read_only_fields = [
            "id",
            "workspace",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class InitiativeEpicSerializer(DynamicBaseSerializer):
    epic_detail = serializers.SerializerMethodField()

    class Meta:
        model = InitiativeEpic
        fields = "__all__"
        read_only_fields = [
            "id",
            "initiative",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]

    def get_epic_detail(self, obj):
        epic = obj.epic
        # Sub-issue progress for this epic
        sub_issues = Issue.objects.filter(parent=epic, deleted_at__isnull=True)
        total = sub_issues.count()
        completed = sub_issues.filter(
            state__group__in=["completed", "cancelled"]
        ).count()
        return {
            "id": str(epic.id),
            "name": epic.name,
            "sequence_id": epic.sequence_id,
            "project_id": str(epic.project_id),
            "status": str(epic.state_id) if epic.state_id else None,
            "sub_issues_count": total,
            "completed_sub_issues_count": completed,
        }


class InitiativeListSerializer(BaseSerializer):
    """Lightweight serializer for list views — omits heavy description fields."""

    owner_detail = UserLiteSerializer(source="owner", read_only=True)
    epic_count = serializers.IntegerField(read_only=True)
    completed_epic_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Initiative
        fields = [
            "id",
            "name",
            "status",
            "start_date",
            "end_date",
            "workspace",
            "owner",
            "owner_detail",
            "sort_order",
            "archived_at",
            "epic_count",
            "completed_epic_count",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class InitiativeLiteSerializer(DynamicBaseSerializer):
    class Meta:
        model = Initiative
        fields = ["id", "name", "status", "start_date", "end_date"]
