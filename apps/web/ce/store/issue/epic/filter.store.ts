import type { IProjectIssuesFilter } from "@/store/issue/project";
import { ProjectIssuesFilter } from "@/store/issue/project";
import type { IIssueRootStore } from "@/store/issue/root.store";

export type IProjectEpicsFilter = IProjectIssuesFilter;

export class ProjectEpicsFilter extends ProjectIssuesFilter implements IProjectEpicsFilter {
  constructor(rootStore: IIssueRootStore) {
    super(rootStore);
  }

  override updateFilterExpression: IProjectEpicsFilter["updateFilterExpression"] = async (
    workspaceSlug,
    projectId,
    filters
  ) => {
    await super.updateFilterExpression(workspaceSlug, projectId, filters);
    await this.rootIssueStore.projectEpics.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
  };

  override updateFilters: IProjectEpicsFilter["updateFilters"] = async (workspaceSlug, projectId, type, filters) => {
    await super.updateFilters(workspaceSlug, projectId, type, filters);
    await this.rootIssueStore.projectEpics.fetchIssuesWithExistingPagination(workspaceSlug, projectId, "mutation");
  }
}
