import type { IProjectIssuesFilter } from "@/store/issue/project";
import { ProjectIssuesFilter } from "@/store/issue/project";
import type { IIssueRootStore } from "@/store/issue/root.store";

export type IProjectEpicsFilter = IProjectIssuesFilter;

export class ProjectEpicsFilter implements IProjectEpicsFilter {
  private projectIssuesFilter: ProjectIssuesFilter;
  rootIssueStore: IIssueRootStore;

  constructor(rootStore: IIssueRootStore) {
    this.rootIssueStore = rootStore;
    this.projectIssuesFilter = new ProjectIssuesFilter(rootStore);
  }

  get filters() {
    return this.projectIssuesFilter.filters;
  }

  get issueFilters() {
    return this.projectIssuesFilter.issueFilters;
  }

  get appliedFilters() {
    return this.projectIssuesFilter.appliedFilters;
  }

  getFilterParams: IProjectEpicsFilter["getFilterParams"] = (...args) => this.projectIssuesFilter.getFilterParams(...args);

  getIssueFilters: IProjectEpicsFilter["getIssueFilters"] = (projectId) => this.projectIssuesFilter.getIssueFilters(projectId);

  fetchFilters: IProjectEpicsFilter["fetchFilters"] = async (workspaceSlug, projectId) =>
    this.projectIssuesFilter.fetchFilters(workspaceSlug, projectId);

  updateFilterExpression: IProjectEpicsFilter["updateFilterExpression"] = async (workspaceSlug, projectId, filters) => {
    await this.projectIssuesFilter.updateFilterExpression(workspaceSlug, projectId, filters);
    await this.rootIssueStore.projectEpics.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
  };

  updateFilters: IProjectEpicsFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters) => {
    await this.projectIssuesFilter.updateFilters(workspaceSlug, projectId, type, filters);
    await this.rootIssueStore.projectEpics.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
  };
}
