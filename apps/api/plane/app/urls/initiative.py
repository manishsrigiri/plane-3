

from django.urls import path

from plane.app.views import InitiativeViewSet, InitiativeEpicViewSet

urlpatterns = [
    # Initiative CRUD
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
    # Initiative Epics
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
]
