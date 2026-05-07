export type TInitiativeStatus = "backlog" | "planned" | "in_progress" | "paused" | "completed" | "cancelled";

export type TInitiative = {
  id: string;
  name: string;
  description: string;
  description_html: string;
  status: TInitiativeStatus;
  owner: string | null;
  owner_detail?: {
    id: string;
    display_name: string;
    avatar: string;
  };
  workspace: string;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  archived_at: string | null;
  epic_count: number;
  completed_epic_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type TInitiativeEpic = {
  id: string;
  initiative: string;
  epic: string;
  epic_detail: {
    id: string;
    name: string;
    sequence_id: number;
    project_id: string;
    status: string | null;
    sub_issues_count: number;
    completed_sub_issues_count: number;
  };
  created_at: string;
  updated_at: string;
};

export type TInitiativeMap = Record<string, TInitiative>;
export type TInitiativeEpicMap = Record<string, TInitiativeEpic[]>;
