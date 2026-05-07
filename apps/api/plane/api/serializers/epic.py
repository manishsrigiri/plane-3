# Django imports
from django.utils import timezone
from lxml import html

# Third party imports
from rest_framework import serializers

# Module imports
from plane.db.models import (
    Issue,
    IssueType,
    User,
)
from plane.utils.content_validator import (
    validate_html_content,
)

from .base import BaseSerializer
from .user import UserLiteSerializer


class EpicSerializer(BaseSerializer):
    """
    Epic serializer - Handles Epic-type work items.
    
    Automatically enforces type='Epic' and prevents client from overriding it.
    """
    
    assignees = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.values_list("id", flat=True)),
        write_only=True,
        required=False,
    )
    
    total_issues = serializers.SerializerMethodField()
    
    class Meta:
        model = Issue
        fields = [
            "id",
            "name",
            "description",
            "description_html",
            "type",
            "assignees",
            "priority",
            "start_date",
            "target_date",
            "state",
            "sequence_id",
            "total_issues",
            "project",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "type",
            "sequence_id",
            "created_by",
            "created_at",
            "updated_at",
            "workspace",
            "project",
        ]
    
    def get_total_issues(self, obj):
        """Get count of non-epic issues linked to this epic"""
        from plane.db.models import IssueType
        epic_type = IssueType.objects.filter(workspace=obj.project.workspace, is_epic=True).first()
        return Issue.objects.filter(parent=obj).exclude(type=epic_type).count()
    
    def validate(self, data):
        # Remove type if client tries to set it
        data.pop("type", None)
        
        if (
            data.get("start_date", None) is not None
            and data.get("target_date", None) is not None
            and data.get("start_date", None) > data.get("target_date", None)
        ):
            raise serializers.ValidationError("Start date cannot exceed target date")

        try:
            if data.get("description_html", None) is not None:
                parsed = html.fromstring(data["description_html"])
                parsed_str = html.tostring(parsed, encoding="unicode")
                data["description_html"] = parsed_str
        except Exception:
            raise serializers.ValidationError("Invalid HTML passed")

        # Validate description content for security
        if data.get("description_html"):
            is_valid, error_msg, sanitized_html = validate_html_content(data["description_html"])
            if not is_valid:
                raise serializers.ValidationError({"error": "html content is not valid"})
            if sanitized_html is not None:
                data["description_html"] = sanitized_html

        return data

    def create(self, validated_data):
        """Force type='EPIC' on creation"""
        from plane.db.models import IssueType
        
        # Get or find the Epic IssueType
        epic_type = IssueType.objects.filter(
            workspace=self.context["request"].workspace if hasattr(self.context["request"], "workspace") else 
                      self.context.get("project").workspace,
            is_epic=True
        ).first()
        
        if not epic_type:
            raise serializers.ValidationError("Epic type not configured in workspace")
        
        validated_data["type"] = epic_type
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Prevent type change on update"""
        validated_data.pop("type", None)
        return super().update(instance, validated_data)


class EpicListSerializer(BaseSerializer):
    """Lightweight serializer for list views — omits description fields."""

    total_issues = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id",
            "name",
            "type",
            "priority",
            "start_date",
            "target_date",
            "state",
            "sequence_id",
            "total_issues",
            "project",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "type",
            "sequence_id",
            "created_by",
            "created_at",
            "updated_at",
            "project",
        ]

    def get_total_issues(self, obj):
        from plane.db.models import IssueType
        epic_type = IssueType.objects.filter(workspace=obj.project.workspace, is_epic=True).first()
        return Issue.objects.filter(parent=obj).exclude(type=epic_type).count()
