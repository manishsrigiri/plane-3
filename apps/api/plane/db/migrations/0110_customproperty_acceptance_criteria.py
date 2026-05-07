import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0109_initiative"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Add acceptance_criteria_html to Issue
        migrations.AddField(
            model_name="issue",
            name="acceptance_criteria_html",
            field=models.TextField(blank=True, default="<p></p>"),
        ),
        # 2. CustomProperty table
        migrations.CreateModel(
            name="CustomProperty",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        db_index=True, default=uuid.uuid4, editable=False,
                        primary_key=True, serialize=False, unique=True,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("display_name", models.CharField(blank=True, max_length=255)),
                (
                    "property_type",
                    models.CharField(
                        choices=[
                            ("rich_text", "Rich Text"), ("text", "Text"),
                            ("number", "Number"), ("boolean", "Boolean"),
                            ("date", "Date"), ("select", "Select"),
                            ("multi_select", "Multi-Select"),
                        ],
                        default="rich_text",
                        max_length=20,
                    ),
                ),
                ("is_required", models.BooleanField(default=False)),
                ("sort_order", models.FloatField(default=65535)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL, verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="custom_properties", to="db.workspace",
                    ),
                ),
                (
                    "issue_type",
                    models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="custom_properties", to="db.issuetype",
                    ),
                ),
            ],
            options={
                "verbose_name": "Custom Property",
                "verbose_name_plural": "Custom Properties",
                "db_table": "custom_properties",
                "ordering": ("sort_order",),
            },
        ),
        # 3. IssueCustomPropertyValue table
        migrations.CreateModel(
            name="IssueCustomPropertyValue",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        db_index=True, default=uuid.uuid4, editable=False,
                        primary_key=True, serialize=False, unique=True,
                    ),
                ),
                ("value_text", models.TextField(blank=True, default="")),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL, verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True, on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By",
                    ),
                ),
                (
                    "issue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="custom_property_values", to="db.issue",
                    ),
                ),
                (
                    "property",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="values", to="db.customproperty",
                    ),
                ),
            ],
            options={
                "verbose_name": "Issue Custom Property Value",
                "verbose_name_plural": "Issue Custom Property Values",
                "db_table": "issue_custom_property_values",
                "unique_together": {("issue", "property")},
            },
        ),
    ]
