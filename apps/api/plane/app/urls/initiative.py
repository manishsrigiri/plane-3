
from django.urls import path

from plane.app.views import InitiativeViewSet, InitiativeEpicViewSet, ProjectInitiativeViewSet, ProjectInitiativeEpicViewSet

urlpatterns = [
    # Workspace-scoped Initiative CRUD
    path(
        "workspaces/<str:slug>/initiatives/",
        InitiativeViewSet.as_view(),
        name="workspace-initiatives",
    ),
    path(
        "workspaces/<str:slug>/initiatives/<uuid:pk>/",
        InitiativeViewSet.as_view(),
        name="workspace-initiative-detail",
    ),
    # Workspace-scoped Initiative Epics
    path(
        "workspaces/<str:slug>/initiatives/<uuid:initiative_id>/epics/",
        InitiativeEpicViewSet.as_view(),
        name="workspace-initiative-epics",
    ),
    path(
        "workspaces/<str:slug>/initiatives/<uuid:initiative_id>/epics/<uuid:epic_id>/",
        InitiativeEpicViewSet.as_view(),
        name="workspace-initiative-epic-detail",
    ),
    # Project-scoped Initiative CRUD
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/initiatives/",
        ProjectInitiativeViewSet.as_view(),
        name="project-initiatives",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/initiatives/<uuid:pk>/",
        ProjectInitiativeViewSet.as_view(),
        name="project-initiative-detail",
    ),
    # Project-scoped Initiative Epics
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/initiatives/<uuid:initiative_id>/epics/",
        ProjectInitiativeEpicViewSet.as_view(),
        name="project-initiative-epics",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/initiatives/<uuid:initiative_id>/epics/<uuid:epic_id>/",
        ProjectInitiativeEpicViewSet.as_view(),
        name="project-initiative-epic-detail",
    ),
]
