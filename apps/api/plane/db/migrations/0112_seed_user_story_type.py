from django.db import migrations


def seed_user_story_type(apps, schema_editor):
    """
    For every workspace, create a 'User Story' IssueType (if one does not already exist),
    assign it to all projects in that workspace, create an 'Acceptance Criteria'
    rich-text CustomProperty, and seed a Fibonacci Story Points estimate for every
    project that has no active estimate.
    """
    Workspace = apps.get_model("db", "Workspace")
    IssueType = apps.get_model("db", "IssueType")
    ProjectIssueType = apps.get_model("db", "ProjectIssueType")
    Project = apps.get_model("db", "Project")
    CustomProperty = apps.get_model("db", "CustomProperty")
    Estimate = apps.get_model("db", "Estimate")
    EstimatePoint = apps.get_model("db", "EstimatePoint")

    FIBONACCI_VALUES = ["1", "2", "3", "5", "8", "13", "21"]

    # All workspaces that have not been soft-deleted
    for workspace in Workspace.objects.filter(deleted_at__isnull=True):
        # ── 1. Create or locate the User Story IssueType ──────────────────
        user_story_type, _ = IssueType.objects.get_or_create(
            workspace=workspace,
            name="User Story",
            defaults={
                "description": "A user-facing feature description written from the user's perspective.",
                "is_epic": False,
                "is_default": False,
                "is_active": True,
                "level": 1.0,
            },
        )

        # ── 2. Assign User Story type to every non-deleted project ─────────
        for project in Project.objects.filter(workspace=workspace, deleted_at__isnull=True):
            ProjectIssueType.objects.get_or_create(
                project=project,
                issue_type=user_story_type,
                deleted_at=None,
                defaults={"workspace": workspace, "level": 1, "is_default": False},
            )

            # ── 3. Story Points (Fibonacci) estimate per project ───────────
            if not Estimate.objects.filter(project=project, last_used=True).exists():
                estimate = Estimate.objects.create(
                    workspace=workspace,
                    project=project,
                    name="Story Points",
                    description="Fibonacci story-point scale for effort estimation.",
                    type="points",
                    last_used=True,
                )
                for key, value in enumerate(FIBONACCI_VALUES):
                    EstimatePoint.objects.create(
                        workspace=workspace,
                        project=project,
                        estimate=estimate,
                        key=key,
                        value=value,
                        description="",
                    )

        # ── 4. Create Acceptance Criteria CustomProperty for User Story ────
        CustomProperty.objects.get_or_create(
            workspace=workspace,
            issue_type=user_story_type,
            name="acceptance_criteria",
            defaults={
                "display_name": "Acceptance Criteria",
                "property_type": "rich_text",
                "is_required": False,
                "sort_order": 1.0,
                "is_active": True,
            },
        )


def reverse_seed(apps, schema_editor):
    IssueType = apps.get_model("db", "IssueType")
    CustomProperty = apps.get_model("db", "CustomProperty")

    user_story_types = IssueType.objects.filter(name="User Story", is_epic=False)
    CustomProperty.objects.filter(issue_type__in=user_story_types, name="acceptance_criteria").delete()
    user_story_types.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0111_performance_indexes"),
    ]

    operations = [
        migrations.RunPython(seed_user_story_type, reverse_code=reverse_seed),
    ]
