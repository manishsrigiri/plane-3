from django.urls import path
from plane.api.views import (
    EpicListCreateAPIView,
    EpicDetailAPIView,
    EpicIssuesAPIView,
    EpicProgressAPIView,
    EpicUpdateAPIView,
)

urlpatterns = [
    # Epic CRUD endpoints
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/",
        EpicListCreateAPIView.as_view(),
        name="epic-list-create",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/",
        EpicDetailAPIView.as_view(),
        name="epic-detail",
    ),
    # Get issues under an epic
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/issues/",
        EpicIssuesAPIView.as_view(),
        name="epic-issues",
    ),
    # Epic progress aggregation
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/progress/",
        EpicProgressAPIView.as_view(),
        name="epic-progress",
    ),
    # Epic status updates (rocket icon)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/updates/",
        EpicUpdateAPIView.as_view(),
        name="epic-updates",
    ),
]
