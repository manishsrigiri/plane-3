from django.db import models
from .base import BaseModel


class EpicUpdate(BaseModel):
    STATUS_CHOICES = [
        ("on_track", "On Track"),
        ("at_risk", "At Risk"),
        ("off_track", "Off Track"),
    ]

    epic = models.ForeignKey(
        "db.Issue",
        related_name="epic_updates",
        on_delete=models.CASCADE,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="on_track")
    comment = models.TextField(blank=True, default="")

    class Meta:
        db_table = "epic_updates"
        ordering = ["-created_at"]
        verbose_name = "Epic Update"
        verbose_name_plural = "Epic Updates"

    def __str__(self):
        return f"{self.epic_id} — {self.status}"
