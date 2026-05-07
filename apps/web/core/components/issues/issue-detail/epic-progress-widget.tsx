"use client";

import { useEffect, useState } from "react";
import { cn } from "@plane/utils";
import { EpicService, type TEpicProgress } from "@/services/epic.service";

const epicService = new EpicService();

const GROUP_CONFIG: {
  key: keyof TEpicProgress["breakdown"];
  label: string;
  color: string;
  barColor: string;
}[] = [
  { key: "completed", label: "Completed", color: "text-green-600 dark:text-green-400", barColor: "bg-green-500" },
  { key: "cancelled", label: "Cancelled", color: "text-gray-500", barColor: "bg-gray-400" },
  { key: "started", label: "In Progress", color: "text-orange-600 dark:text-orange-400", barColor: "bg-orange-500" },
  { key: "unstarted", label: "Unstarted", color: "text-blue-600 dark:text-blue-400", barColor: "bg-blue-400" },
  { key: "backlog", label: "Backlog", color: "text-custom-text-300", barColor: "bg-custom-background-80" },
];

type Props = {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
};

export const EpicProgressWidget: React.FC<Props> = ({ workspaceSlug, projectId, epicId }) => {
  const [progress, setProgress] = useState<TEpicProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceSlug || !projectId || !epicId) return;
    setLoading(true);
    epicService
      .getProgress(workspaceSlug, projectId, epicId)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [workspaceSlug, projectId, epicId]);

  if (loading) {
    return (
      <div className="animate-pulse h-16 rounded-md bg-custom-background-80" />
    );
  }

  if (!progress || progress.total === 0) {
    return (
      <div className="text-xs text-custom-text-400 py-2">
        No child work items yet. Add User Stories to track Epic progress.
      </div>
    );
  }

  const { total, percentage, breakdown } = progress;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-custom-text-300 uppercase tracking-wide">Progress</span>
        <span className="text-sm font-semibold text-custom-text-100">{percentage}%</span>
      </div>

      {/* Segmented progress bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-custom-background-80">
        {GROUP_CONFIG.map(({ key, barColor }) => {
          const count = breakdown[key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={cn("h-full transition-all", barColor)}
              style={{ width: `${pct}%` }}
              title={`${key}: ${count}`}
            />
          );
        })}
      </div>

      {/* State breakdown */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {GROUP_CONFIG.map(({ key, label, color }) => {
          const count = breakdown[key] ?? 0;
          if (count === 0) return null;
          return (
            <span key={key} className={cn("text-xs", color)}>
              {count} {label}
            </span>
          );
        })}
        <span className="text-xs text-custom-text-400 ml-auto">{total} total</span>
      </div>
    </div>
  );
};
