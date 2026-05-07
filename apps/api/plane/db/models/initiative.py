from django.conf import settings
from django.db import models

from .base import BaseModel


class Initiative(BaseModel):
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="workspace_initiatives",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    description_html = models.TextField(blank=True, default="<p></p>")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="owned_initiatives",
        null=True,
        blank=True,
    )

    class StatusChoices(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In Progress"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PLANNED,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    sort_order = models.FloatField(default=65535)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Initiative"
        verbose_name_plural = "Initiatives"
        db_table = "initiatives"
        ordering = ("sort_order",)

    def __str__(self):
        return f"{self.name} - {self.workspace.name}"


class InitiativeEpic(BaseModel):
    """Junction table linking an Initiative to its Epics.
    An epic can belong to at most one Initiative (enforced by unique_together on epic).
    """

    initiative = models.ForeignKey(
        Initiative,
        on_delete=models.CASCADE,
        related_name="initiative_epics",
    )
    epic = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="epic_initiatives",
    )

    class Meta:
        verbose_name = "Initiative Epic"
        verbose_name_plural = "Initiative Epics"
        db_table = "initiative_epics"
        # One epic can only belong to one initiative
        unique_together = [["epic"]]

    def __str__(self):
        return f"{self.initiative.name} - {self.epic.name}"
