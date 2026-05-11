import { set, action, makeObservable, observable, runInAction } from "mobx";
import type { TInitiative, TInitiativeEpic } from "@plane/types";
import { InitiativeService } from "@/services/initiative.service";

export interface IInitiativeStore {
  // observables
  loader: boolean;
  initiativeMap: Record<string, TInitiative>;
  epicMap: Record<string, TInitiativeEpic[]>; // keyed by initiativeId
  // workspace-scoped actions
  fetchInitiatives: (workspaceSlug: string) => Promise<TInitiative[]>;
  fetchInitiativeById: (workspaceSlug: string, initiativeId: string) => Promise<TInitiative>;
  createInitiative: (workspaceSlug: string, data: Partial<TInitiative>) => Promise<TInitiative>;
  updateInitiative: (workspaceSlug: string, initiativeId: string, data: Partial<TInitiative>) => Promise<TInitiative>;
  deleteInitiative: (workspaceSlug: string, initiativeId: string) => Promise<void>;
  fetchInitiativeEpics: (workspaceSlug: string, initiativeId: string) => Promise<TInitiativeEpic[]>;
  addEpicsToInitiative: (workspaceSlug: string, initiativeId: string, epicIds: string[]) => Promise<TInitiativeEpic[]>;
  removeEpicFromInitiative: (workspaceSlug: string, initiativeId: string, epicId: string) => Promise<void>;
  refreshProgress: (workspaceSlug: string, initiativeId: string) => Promise<void>;
  // project-scoped actions
  fetchProjectInitiatives: (workspaceSlug: string, projectId: string) => Promise<TInitiative[]>;
  fetchProjectInitiativeById: (workspaceSlug: string, projectId: string, initiativeId: string) => Promise<TInitiative>;
  createProjectInitiative: (workspaceSlug: string, projectId: string, data: Partial<TInitiative>) => Promise<TInitiative>;
  updateProjectInitiative: (workspaceSlug: string, projectId: string, initiativeId: string, data: Partial<TInitiative>) => Promise<TInitiative>;
  deleteProjectInitiative: (workspaceSlug: string, projectId: string, initiativeId: string) => Promise<void>;
  fetchProjectInitiativeEpics: (workspaceSlug: string, projectId: string, initiativeId: string) => Promise<TInitiativeEpic[]>;
  addEpicsToProjectInitiative: (workspaceSlug: string, projectId: string, initiativeId: string, epicIds: string[]) => Promise<TInitiativeEpic[]>;
  removeEpicFromProjectInitiative: (workspaceSlug: string, projectId: string, initiativeId: string, epicId: string) => Promise<void>;
  refreshProjectProgress: (workspaceSlug: string, projectId: string, initiativeId: string) => Promise<void>;
  // helpers
  getInitiativeById: (initiativeId: string) => TInitiative | undefined;
  getInitiativeEpics: (initiativeId: string) => TInitiativeEpic[];
  getProjectInitiativeIds: (projectId: string) => string[];
  initiativeIds: string[];
}

export class InitiativeStore implements IInitiativeStore {
  loader: boolean = false;
  initiativeMap: Record<string, TInitiative> = {};
  epicMap: Record<string, TInitiativeEpic[]> = {};

  private initiativeService: InitiativeService;

  constructor() {
    makeObservable(this, {
      loader: observable.ref,
      initiativeMap: observable,
      epicMap: observable,
      fetchInitiatives: action,
      fetchInitiativeById: action,
      createInitiative: action,
      updateInitiative: action,
      deleteInitiative: action,
      fetchInitiativeEpics: action,
      addEpicsToInitiative: action,
      removeEpicFromInitiative: action,
      refreshProgress: action,
      fetchProjectInitiatives: action,
      fetchProjectInitiativeById: action,
      createProjectInitiative: action,
      updateProjectInitiative: action,
      deleteProjectInitiative: action,
      fetchProjectInitiativeEpics: action,
      addEpicsToProjectInitiative: action,
      removeEpicFromProjectInitiative: action,
      refreshProjectProgress: action,
    });
    this.initiativeService = new InitiativeService();
  }

  get initiativeIds(): string[] {
    return Object.keys(this.initiativeMap);
  }

  getInitiativeById = (initiativeId: string): TInitiative | undefined =>
    this.initiativeMap[initiativeId];

  getInitiativeEpics = (initiativeId: string): TInitiativeEpic[] =>
    this.epicMap[initiativeId] ?? [];

  fetchInitiatives = async (workspaceSlug: string): Promise<TInitiative[]> => {
    runInAction(() => { this.loader = true; });
    try {
      const initiatives = await this.initiativeService.getInitiatives(workspaceSlug);
      runInAction(() => {
        initiatives.forEach((initiative) => set(this.initiativeMap, initiative.id, initiative));
      });
      return initiatives;
    } finally {
      runInAction(() => { this.loader = false; });
    }
  };

  fetchInitiativeById = async (workspaceSlug: string, initiativeId: string): Promise<TInitiative> => {
    const initiative = await this.initiativeService.getInitiativeById(workspaceSlug, initiativeId);
    runInAction(() => set(this.initiativeMap, initiative.id, initiative));
    return initiative;
  };

  createInitiative = async (workspaceSlug: string, data: Partial<TInitiative>): Promise<TInitiative> => {
    const initiative = await this.initiativeService.createInitiative(workspaceSlug, data);
    runInAction(() => set(this.initiativeMap, initiative.id, initiative));
    return initiative;
  };

  updateInitiative = async (workspaceSlug: string, initiativeId: string, data: Partial<TInitiative>): Promise<TInitiative> => {
    // Optimistic update
    runInAction(() => {
      set(this.initiativeMap, initiativeId, { ...this.initiativeMap[initiativeId], ...data });
    });
    const updated = await this.initiativeService.updateInitiative(workspaceSlug, initiativeId, data);
    runInAction(() => set(this.initiativeMap, initiativeId, updated));
    return updated;
  };

  deleteInitiative = async (workspaceSlug: string, initiativeId: string): Promise<void> => {
    await this.initiativeService.deleteInitiative(workspaceSlug, initiativeId);
    runInAction(() => {
      delete this.initiativeMap[initiativeId];
      delete this.epicMap[initiativeId];
    });
  };

  fetchInitiativeEpics = async (workspaceSlug: string, initiativeId: string): Promise<TInitiativeEpic[]> => {
    const epics = await this.initiativeService.getInitiativeEpics(workspaceSlug, initiativeId);
    runInAction(() => set(this.epicMap, initiativeId, epics));
    return epics;
  };

  addEpicsToInitiative = async (workspaceSlug: string, initiativeId: string, epicIds: string[]): Promise<TInitiativeEpic[]> => {
    const newLinks = await this.initiativeService.addEpicsToInitiative(workspaceSlug, initiativeId, epicIds);
    runInAction(() => {
      const existing = this.epicMap[initiativeId] ?? [];
      set(this.epicMap, initiativeId, [...existing, ...newLinks]);
      // Update epic_count on the initiative
      if (this.initiativeMap[initiativeId]) {
        set(this.initiativeMap, initiativeId, {
          ...this.initiativeMap[initiativeId],
          epic_count: (this.initiativeMap[initiativeId].epic_count ?? 0) + newLinks.length,
        });
      }
    });
    // Refresh accurate counts from server
    this.refreshProgress(workspaceSlug, initiativeId);
    return newLinks;
  };

  removeEpicFromInitiative = async (workspaceSlug: string, initiativeId: string, epicId: string): Promise<void> => {
    await this.initiativeService.removeEpicFromInitiative(workspaceSlug, initiativeId, epicId);
    runInAction(() => {
      const existing = this.epicMap[initiativeId] ?? [];
      set(this.epicMap, initiativeId, existing.filter((e) => e.epic !== epicId));
      if (this.initiativeMap[initiativeId]) {
        set(this.initiativeMap, initiativeId, {
          ...this.initiativeMap[initiativeId],
          epic_count: Math.max(0, (this.initiativeMap[initiativeId].epic_count ?? 1) - 1),
        });
      }
    });
    // Refresh accurate progress counts from server
    this.refreshProgress(workspaceSlug, initiativeId);
  };

  refreshProgress = async (workspaceSlug: string, initiativeId: string): Promise<void> => {
    const fresh = await this.initiativeService.getInitiativeById(workspaceSlug, initiativeId);
    runInAction(() => set(this.initiativeMap, initiativeId, fresh));
  };

  getProjectInitiativeIds = (projectId: string): string[] =>
    Object.values(this.initiativeMap)
      .filter((i) => i.project === projectId)
      .map((i) => i.id);

  fetchProjectInitiatives = async (workspaceSlug: string, projectId: string): Promise<TInitiative[]> => {
    runInAction(() => { this.loader = true; });
    try {
      const initiatives = await this.initiativeService.getProjectInitiatives(workspaceSlug, projectId);
      runInAction(() => {
        initiatives.forEach((initiative) => set(this.initiativeMap, initiative.id, initiative));
      });
      return initiatives;
    } finally {
      runInAction(() => { this.loader = false; });
    }
  };

  fetchProjectInitiativeById = async (workspaceSlug: string, projectId: string, initiativeId: string): Promise<TInitiative> => {
    const initiative = await this.initiativeService.getProjectInitiativeById(workspaceSlug, projectId, initiativeId);
    runInAction(() => set(this.initiativeMap, initiative.id, initiative));
    return initiative;
  };

  createProjectInitiative = async (workspaceSlug: string, projectId: string, data: Partial<TInitiative>): Promise<TInitiative> => {
    const initiative = await this.initiativeService.createProjectInitiative(workspaceSlug, projectId, data);
    runInAction(() => set(this.initiativeMap, initiative.id, initiative));
    return initiative;
  };

  updateProjectInitiative = async (workspaceSlug: string, projectId: string, initiativeId: string, data: Partial<TInitiative>): Promise<TInitiative> => {
    runInAction(() => {
      set(this.initiativeMap, initiativeId, { ...this.initiativeMap[initiativeId], ...data });
    });
    const updated = await this.initiativeService.updateProjectInitiative(workspaceSlug, projectId, initiativeId, data);
    runInAction(() => set(this.initiativeMap, initiativeId, updated));
    return updated;
  };

  deleteProjectInitiative = async (workspaceSlug: string, projectId: string, initiativeId: string): Promise<void> => {
    await this.initiativeService.deleteProjectInitiative(workspaceSlug, projectId, initiativeId);
    runInAction(() => {
      delete this.initiativeMap[initiativeId];
      delete this.epicMap[initiativeId];
    });
  };

  fetchProjectInitiativeEpics = async (workspaceSlug: string, projectId: string, initiativeId: string): Promise<TInitiativeEpic[]> => {
    const epics = await this.initiativeService.getProjectInitiativeEpics(workspaceSlug, projectId, initiativeId);
    runInAction(() => set(this.epicMap, initiativeId, epics));
    return epics;
  };

  addEpicsToProjectInitiative = async (workspaceSlug: string, projectId: string, initiativeId: string, epicIds: string[]): Promise<TInitiativeEpic[]> => {
    const newLinks = await this.initiativeService.addEpicsToProjectInitiative(workspaceSlug, projectId, initiativeId, epicIds);
    runInAction(() => {
      const existing = this.epicMap[initiativeId] ?? [];
      set(this.epicMap, initiativeId, [...existing, ...newLinks]);
      if (this.initiativeMap[initiativeId]) {
        set(this.initiativeMap, initiativeId, {
          ...this.initiativeMap[initiativeId],
          epic_count: (this.initiativeMap[initiativeId].epic_count ?? 0) + newLinks.length,
        });
      }
    });
    this.refreshProjectProgress(workspaceSlug, projectId, initiativeId);
    return newLinks;
  };

  removeEpicFromProjectInitiative = async (workspaceSlug: string, projectId: string, initiativeId: string, epicId: string): Promise<void> => {
    await this.initiativeService.removeEpicFromProjectInitiative(workspaceSlug, projectId, initiativeId, epicId);
    runInAction(() => {
      const existing = this.epicMap[initiativeId] ?? [];
      set(this.epicMap, initiativeId, existing.filter((e) => e.epic !== epicId));
      if (this.initiativeMap[initiativeId]) {
        set(this.initiativeMap, initiativeId, {
          ...this.initiativeMap[initiativeId],
          epic_count: Math.max(0, (this.initiativeMap[initiativeId].epic_count ?? 1) - 1),
        });
      }
    });
    this.refreshProjectProgress(workspaceSlug, projectId, initiativeId);
  };

  refreshProjectProgress = async (workspaceSlug: string, projectId: string, initiativeId: string): Promise<void> => {
    const fresh = await this.initiativeService.getProjectInitiativeById(workspaceSlug, projectId, initiativeId);
    runInAction(() => set(this.initiativeMap, initiativeId, fresh));
  };
}
