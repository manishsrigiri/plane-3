from django.apps import AppConfig


class AppApiConfig(AppConfig):
    name = "plane.app"

    def ready(self):
        from django.db.models.signals import post_save
        from django.dispatch import receiver

        @receiver(post_save, sender="db.Workspace", weak=False, dispatch_uid="workspace_seed_user_story_type")
        def on_workspace_created(sender, instance, created, **kwargs):
            if not created:
                return
            _seed_workspace(instance)

        @receiver(post_save, sender="db.Project", weak=False, dispatch_uid="project_seed_user_story_type")
        def on_project_created(sender, instance, created, **kwargs):
            if not created or instance.deleted_at:
                return
            _seed_project(instance.workspace, instance)


def _seed_workspace(workspace):
    """Create User Story type + Acceptance Criteria property for a new workspace."""
    from plane.db.models import IssueType, CustomProperty

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
    return user_story_type


def _seed_project(workspace, project):
    """Assign the workspace User Story type to a newly created project + seed Fibonacci estimate."""
    from plane.db.models import IssueType, ProjectIssueType, Estimate, EstimatePoint

    user_story_type = IssueType.objects.filter(workspace=workspace, name="User Story", is_active=True).first()
    if not user_story_type:
        user_story_type = _seed_workspace(workspace)

    ProjectIssueType.objects.get_or_create(
        project=project,
        issue_type=user_story_type,
        deleted_at=None,
        defaults={"workspace": workspace, "level": 1, "is_default": False},
    )

    if not Estimate.objects.filter(project=project, last_used=True).exists():
        estimate = Estimate.objects.create(
            workspace=workspace,
            project=project,
            name="Story Points",
            description="Fibonacci story-point scale for effort estimation.",
            type="points",
            last_used=True,
        )
        for key, value in enumerate(["1", "2", "3", "5", "8", "13", "21"]):
            EstimatePoint.objects.create(
                workspace=workspace,
                project=project,
                estimate=estimate,
                key=key,
                value=value,
                description="",
            )
