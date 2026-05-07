import { set, action, makeObservable, observable, runInAction, computed } from "mobx";
import { WorkItemTypeService, type TWorkItemType } from "@/services/work-item-type.service";

export interface IWorkItemTypeStore {
  // observables
  loader: boolean;
  typeMap: Record<string, TWorkItemType>;
  // computed
  workspaceTypes: TWorkItemType[];
  // actions
  fetchWorkspaceTypes: (workspaceSlug: string) => Promise<TWorkItemType[]>;
  createType: (workspaceSlug: string, data: Partial<TWorkItemType>) => Promise<TWorkItemType>;
  updateType: (workspaceSlug: string, typeId: string, data: Partial<TWorkItemType>) => Promise<TWorkItemType>;
  deleteType: (workspaceSlug: string, typeId: string) => Promise<void>;
  // helpers
  getTypeById: (typeId: string) => TWorkItemType | undefined;
  getProjectTypes: (projectId: string) => TWorkItemType[];
  getUserStoryType: (projectId: string) => TWorkItemType | undefined;
  getDefaultType: (projectId: string) => TWorkItemType | undefined;
}

export class WorkItemTypeStore implements IWorkItemTypeStore {
  loader: boolean = false;
  typeMap: Record<string, TWorkItemType> = {};

  private service: WorkItemTypeService;

  constructor() {
    makeObservable(this, {
      loader: observable.ref,
      typeMap: observable,
      workspaceTypes: computed,
      fetchWorkspaceTypes: action,
      createType: action,
      updateType: action,
      deleteType: action,
    });
    this.service = new WorkItemTypeService();
  }

  get workspaceTypes(): TWorkItemType[] {
    return Object.values(this.typeMap).filter((t) => t.is_active);
  }

  getTypeById = (typeId: string): TWorkItemType | undefined => this.typeMap[typeId];

  getProjectTypes = (projectId: string): TWorkItemType[] =>
    this.workspaceTypes.filter((t) => t.project_ids?.includes(projectId));

  getUserStoryType = (projectId: string): TWorkItemType | undefined =>
    this.getProjectTypes(projectId).find((t) => !t.is_epic && t.name.toLowerCase().includes("user story"));

  getDefaultType = (projectId: string): TWorkItemType | undefined =>
    this.getProjectTypes(projectId).find((t) => !t.is_epic && t.is_default === true);

  fetchWorkspaceTypes = async (workspaceSlug: string): Promise<TWorkItemType[]> => {
    runInAction(() => { this.loader = true; });
    try {
      const types = await this.service.getWorkspaceTypes(workspaceSlug);
      runInAction(() => {
        types.forEach((t) => set(this.typeMap, t.id, t));
      });
      return types;
    } finally {
      runInAction(() => { this.loader = false; });
    }
  };

  createType = async (workspaceSlug: string, data: Partial<TWorkItemType>): Promise<TWorkItemType> => {
    const type = await this.service.createType(workspaceSlug, data);
    runInAction(() => set(this.typeMap, type.id, type));
    return type;
  };

  updateType = async (workspaceSlug: string, typeId: string, data: Partial<TWorkItemType>): Promise<TWorkItemType> => {
    const updated = await this.service.updateType(workspaceSlug, typeId, data);
    runInAction(() => set(this.typeMap, typeId, updated));
    return updated;
  };

  deleteType = async (workspaceSlug: string, typeId: string): Promise<void> => {
    await this.service.deleteType(workspaceSlug, typeId);
    runInAction(() => { delete this.typeMap[typeId]; });
  };
}
