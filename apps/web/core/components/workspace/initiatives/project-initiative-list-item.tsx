"use client";

import { memo } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import type { TInitiative } from "@plane/types";
import { ProgressBar } from "./progress-bar";

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-400",
  planned: "bg-blue-400",
  in_progress: "bg-orange-400",
  paused: "bg-yellow-400",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

type Props = {
  initiative: TInitiative;
  workspaceSlug: string;
  projectId: string;
};

export const ProjectInitiativeListItem = memo(
  observer(({ initiative, workspaceSlug, projectId }: Props) => {
    const color = STATUS_COLORS[initiative.status] ?? "bg-gray-400";
    const label = STATUS_LABELS[initiative.status] ?? initiative.status;
    const completed = initiative.completed_epic_count ?? 0;
    const total = initiative.epic_count ?? 0;

    return (
      <Link href={`/${workspaceSlug}/projects/${projectId}/initiatives/${initiative.id}/`}>
        <div className="flex flex-col gap-2 px-4 py-3 hover:bg-custom-background-90 rounded-md cursor-pointer border border-custom-border-100 mb-2 group">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${color}`} title={label} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-custom-text-100 truncate">{initiative.name}</p>
              {initiative.description && (
                <p className="text-xs text-custom-text-300 truncate mt-0.5">{initiative.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 text-xs text-custom-text-300">
              <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-medium ${color}`}>{label}</span>
              <span className="hidden group-hover:inline">
                {completed}/{total} epic{total !== 1 ? "s" : ""}
              </span>
              {initiative.end_date && (
                <span>Due {new Date(initiative.end_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {total > 0 && (
            <div className="pl-6">
              <ProgressBar completed={completed} total={total} size="sm" />
            </div>
          )}
        </div>
      </Link>
    );
  })
);
