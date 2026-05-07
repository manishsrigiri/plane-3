import { API_BASE_URL } from "@plane/constants";
import type { ISearchIssueResponse, TInitiative, TInitiativeEpic } from "@plane/types";
import { APIService } from "@/services/api.service";

export class InitiativeService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getInitiatives(workspaceSlug: string, params?: Record<string, string>): Promise<TInitiative[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/initiatives/`, { params })
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async getInitiativeById(workspaceSlug: string, initiativeId: string): Promise<TInitiative> {
    return this.get(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async createInitiative(workspaceSlug: string, data: Partial<TInitiative>): Promise<TInitiative> {
    return this.post(`/api/workspaces/${workspaceSlug}/initiatives/`, data)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async updateInitiative(workspaceSlug: string, initiativeId: string, data: Partial<TInitiative>): Promise<TInitiative> {
    return this.patch(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/`, data)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async deleteInitiative(workspaceSlug: string, initiativeId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async getInitiativeEpics(workspaceSlug: string, initiativeId: string): Promise<TInitiativeEpic[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/epics/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async addEpicsToInitiative(workspaceSlug: string, initiativeId: string, epicIds: string[]): Promise<TInitiativeEpic[]> {
    return this.post(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/epics/`, { epic_ids: epicIds })
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async removeEpicFromInitiative(workspaceSlug: string, initiativeId: string, epicId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/initiatives/${initiativeId}/epics/${epicId}/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async searchEpics(workspaceSlug: string, search: string): Promise<ISearchIssueResponse[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/search-epics/`, { params: { search } })
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }
}
