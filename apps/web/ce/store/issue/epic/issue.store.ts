import type { IProjectIssues } from "@/store/issue/project";
import { ProjectIssues } from "@/store/issue/project";
import type { IIssueRootStore } from "@/store/issue/root.store";
import { EIssueServiceType } from "@plane/types";
import type { IProjectEpicsFilter } from "./filter.store";

export type IProjectEpics = IProjectIssues;

export class ProjectEpics extends ProjectIssues implements IProjectEpics {
  constructor(rootStore: IIssueRootStore, issueFilterStore: IProjectEpicsFilter) {
    super(rootStore, issueFilterStore, EIssueServiceType.EPICS);
  }
}
