import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0108_issue_epic"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Initiative",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("description_html", models.TextField(blank=True, default="<p></p>")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("backlog", "Backlog"),
                            ("planned", "Planned"),
                            ("in_progress", "In Progress"),
                            ("paused", "Paused"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="planned",
                        max_length=20,
                    ),
                ),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                ("sort_order", models.FloatField(default=65535)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="owned_initiatives",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_initiatives",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Initiative",
                "verbose_name_plural": "Initiatives",
                "db_table": "initiatives",
                "ordering": ("sort_order",),
            },
        ),
        migrations.CreateModel(
            name="InitiativeEpic",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "initiative",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="initiative_epics",
                        to="db.initiative",
                    ),
                ),
                (
                    "epic",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="epic_initiatives",
                        to="db.issue",
                    ),
                ),
            ],
            options={
                "verbose_name": "Initiative Epic",
                "verbose_name_plural": "Initiative Epics",
                "db_table": "initiative_epics",
            },
        ),
        migrations.AddConstraint(
            model_name="initiativeepic",
            constraint=models.UniqueConstraint(
                fields=["epic"],
                name="unique_epic_per_initiative",
            ),
        ),
    ]
