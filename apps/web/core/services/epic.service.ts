import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";

export type TEpicProgress = {
  epic_id: string;
  total: number;
  percentage: number;
  breakdown: {
    backlog: number;
    unstarted: number;
    started: number;
    completed: number;
    cancelled: number;
  };
};

export type TEpicUpdate = {
  id: string;
  status: "on_track" | "at_risk" | "off_track";
  comment: string;
  created_at: string;
  created_by: string | null;
  created_by_display_name: string | null;
};

export class EpicService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getProgress(workspaceSlug: string, projectId: string, epicId: string): Promise<TEpicProgress> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/progress/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async getUpdates(workspaceSlug: string, projectId: string, epicId: string): Promise<TEpicUpdate[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/updates/`)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }

  async createUpdate(
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: { status: TEpicUpdate["status"]; comment?: string }
  ): Promise<TEpicUpdate> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/epics/${epicId}/updates/`, data)
      .then((res) => res?.data)
      .catch((err) => { throw err?.response?.data; });
  }
}
