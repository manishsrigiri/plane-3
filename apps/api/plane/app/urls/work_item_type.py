from django.urls import path

from plane.app.views import (
    WorkspaceWorkItemTypeEndpoint,
    ProjectWorkItemTypeEndpoint,
    CustomPropertyEndpoint,
    IssueCustomPropertyValueEndpoint,
    FibonacciEstimateSetupEndpoint,
)

urlpatterns = [
    # Workspace-level work item type CRUD
    path(
        "workspaces/<str:slug>/work-item-types/",
        WorkspaceWorkItemTypeEndpoint.as_view(),
        name="workspace-work-item-types",
    ),
    path(
        "workspaces/<str:slug>/work-item-types/<uuid:pk>/",
        WorkspaceWorkItemTypeEndpoint.as_view(),
        name="workspace-work-item-type-detail",
    ),
    # Project-level type assignment
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/work-item-types/",
        ProjectWorkItemTypeEndpoint.as_view(),
        name="project-work-item-types",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/work-item-types/<uuid:type_id>/",
        ProjectWorkItemTypeEndpoint.as_view(),
        name="project-work-item-type-detail",
    ),
    # Custom properties
    path(
        "workspaces/<str:slug>/custom-properties/",
        CustomPropertyEndpoint.as_view(),
        name="workspace-custom-properties",
    ),
    path(
        "workspaces/<str:slug>/custom-properties/<uuid:pk>/",
        CustomPropertyEndpoint.as_view(),
        name="workspace-custom-property-detail",
    ),
    # Custom property values per issue
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/custom-property-values/",
        IssueCustomPropertyValueEndpoint.as_view(),
        name="issue-custom-property-values",
    ),
    # Fibonacci estimate setup
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/setup-fibonacci-estimate/",
        FibonacciEstimateSetupEndpoint.as_view(),
        name="setup-fibonacci-estimate",
    ),
]
