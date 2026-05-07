from django.db import models
from .base import BaseModel


class CustomProperty(BaseModel):
    """Type-bound custom property definition (workspace-scoped).
    Example: Acceptance Criteria (rich_text) bound to User Story type_id.
    """

    class PropertyType(models.TextChoices):
        RICH_TEXT = "rich_text", "Rich Text"
        TEXT = "text", "Text"
        NUMBER = "number", "Number"
        BOOLEAN = "boolean", "Boolean"
        DATE = "date", "Date"
        SELECT = "select", "Select"
        MULTI_SELECT = "multi_select", "Multi-Select"

    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="custom_properties",
    )
    # Bound to a specific IssueType (e.g. User Story)
    issue_type = models.ForeignKey(
        "db.IssueType",
        on_delete=models.CASCADE,
        related_name="custom_properties",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True)
    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        default=PropertyType.RICH_TEXT,
    )
    is_required = models.BooleanField(default=False)
    sort_order = models.FloatField(default=65535)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Custom Property"
        verbose_name_plural = "Custom Properties"
        db_table = "custom_properties"
        ordering = ("sort_order",)

    def __str__(self):
        return f"{self.name} ({self.property_type})"


class IssueCustomPropertyValue(BaseModel):
    """Stores the actual value of a CustomProperty for a specific Issue."""

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="custom_property_values",
    )
    property = models.ForeignKey(
        CustomProperty,
        on_delete=models.CASCADE,
        related_name="values",
    )
    # All values stored as text; rich_text stores HTML
    value_text = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Issue Custom Property Value"
        verbose_name_plural = "Issue Custom Property Values"
        db_table = "issue_custom_property_values"
        unique_together = [["issue", "property"]]

    def __str__(self):
        return f"{self.issue_id} - {self.property.name}"
