import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";

export type TWorkItemType = {
  id: string;
  name: string;
  description: string;
  logo_props: Record<string, unknown>;
  is_epic: boolean;
  is_default: boolean;
  is_active: boolean;
  level: number;
  workspace: string;
  project_ids: string[];
  created_at: string;
  updated_at: string;
};

export class WorkItemTypeService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getWorkspaceTypes(workspaceSlug: string): Promise<TWorkItemType[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/work-item-types/`)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async createType(workspaceSlug: string, data: Partial<TWorkItemType>): Promise<TWorkItemType> {
    return this.post(`/api/workspaces/${workspaceSlug}/work-item-types/`, data)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async updateType(workspaceSlug: string, typeId: string, data: Partial<TWorkItemType>): Promise<TWorkItemType> {
    return this.patch(`/api/workspaces/${workspaceSlug}/work-item-types/${typeId}/`, data)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async deleteType(workspaceSlug: string, typeId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/work-item-types/${typeId}/`)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async getProjectTypes(workspaceSlug: string, projectId: string): Promise<TWorkItemType[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/`)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async assignTypeToProject(workspaceSlug: string, projectId: string, typeId: string): Promise<TWorkItemType> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/`, { type_id: typeId })
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async removeTypeFromProject(workspaceSlug: string, projectId: string, typeId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/`)
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }

  async setupFibonacciEstimate(workspaceSlug: string, projectId: string): Promise<{ detail: string; estimate_id: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/setup-fibonacci-estimate/`, {})
      .then((r) => r?.data)
      .catch((e) => { throw e?.response?.data; });
  }
}
