"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, ChevronDown, Clock } from "lucide-react";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { cn } from "@plane/utils";
import { EpicService, type TEpicUpdate } from "@/services/epic.service";

const epicService = new EpicService();

const STATUS_CONFIG: {
  value: TEpicUpdate["status"];
  label: string;
  color: string;
  dotColor: string;
  bgColor: string;
}[] = [
  {
    value: "on_track",
    label: "On Track",
    color: "text-green-700 dark:text-green-400",
    dotColor: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
  },
  {
    value: "at_risk",
    label: "At Risk",
    color: "text-yellow-700 dark:text-yellow-400",
    dotColor: "bg-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
  },
  {
    value: "off_track",
    label: "Off Track",
    color: "text-red-700 dark:text-red-400",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
  },
];

function getConfig(value: TEpicUpdate["status"] | null) {
  return STATUS_CONFIG.find((c) => c.value === value) ?? null;
}

type Props = {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  canEdit: boolean;
};

export const EpicUpdatePanel: React.FC<Props> = ({ workspaceSlug, projectId, epicId, canEdit }) => {
  const [updates, setUpdates] = useState<TEpicUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TEpicUpdate["status"]>("on_track");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const latest = updates[0] ?? null;
  const latestConfig = getConfig(latest?.status ?? null);

  useEffect(() => {
    if (!workspaceSlug || !projectId || !epicId) return;
    epicService
      .getUpdates(workspaceSlug, projectId, epicId)
      .then(setUpdates)
      .finally(() => setLoading(false));
  }, [workspaceSlug, projectId, epicId]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
        setFormOpen(false);
      }
    };
    if (panelOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    try {
      const newUpdate = await epicService.createUpdate(workspaceSlug, projectId, epicId, {
        status: selectedStatus,
        comment,
      });
      setUpdates((prev) => [newUpdate, ...prev]);
      setComment("");
      setFormOpen(false);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Update posted" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to post update" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors",
          latestConfig
            ? cn(latestConfig.color, "border-current/30", latestConfig.bgColor)
            : "text-custom-text-300 border-custom-border-200 hover:bg-custom-background-90"
        )}
        onClick={() => setPanelOpen((v) => !v)}
        title="Epic health updates"
      >
        <Rocket className="h-3.5 w-3.5 flex-shrink-0" />
        {latestConfig ? (
          <>
            <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", latestConfig.dotColor)} />
            {latestConfig.label}
          </>
        ) : loading ? (
          "Loading…"
        ) : (
          "Add Update"
        )}
        <ChevronDown className="h-3 w-3 flex-shrink-0" />
      </button>

      {/* Dropdown panel */}
      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-custom-border-200 bg-custom-background-100 shadow-lg">
          <div className="flex items-center justify-between border-b border-custom-border-200 px-3 py-2">
            <span className="text-xs font-semibold text-custom-text-200">Epic Health</span>
            {canEdit && !formOpen && (
              <button
                type="button"
                className="text-xs text-custom-primary-100 hover:underline"
                onClick={() => setFormOpen(true)}
              >
                + Add update
              </button>
            )}
          </div>

          {/* Add-update form */}
          {formOpen && canEdit && (
            <div className="border-b border-custom-border-200 p-3 space-y-2">
              <p className="text-xs font-medium text-custom-text-300 mb-1">Set status</p>
              <div className="flex gap-1.5">
                {STATUS_CONFIG.map((cfg) => (
                  <button
                    key={cfg.value}
                    type="button"
                    onClick={() => setSelectedStatus(cfg.value)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium border transition-colors",
                      selectedStatus === cfg.value
                        ? cn(cfg.color, "border-current", cfg.bgColor)
                        : "text-custom-text-300 border-custom-border-200 hover:bg-custom-background-90"
                    )}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", cfg.dotColor)} />
                    {cfg.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="Add a note (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full resize-none rounded-md border border-custom-border-200 bg-custom-background-90 px-2.5 py-1.5 text-xs text-custom-text-100 placeholder:text-custom-text-400 focus:outline-none focus:ring-1 focus:ring-custom-primary-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setComment(""); }}
                  className="rounded px-2.5 py-1 text-xs text-custom-text-300 hover:bg-custom-background-90"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="rounded bg-custom-primary-100 px-2.5 py-1 text-xs font-medium text-white hover:bg-custom-primary-200 disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          )}

          {/* History */}
          <div className="max-h-52 overflow-y-auto divide-y divide-custom-border-100">
            {updates.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-custom-text-400">No updates yet.</p>
            ) : (
              updates.map((u) => {
                const cfg = getConfig(u.status);
                return (
                  <div key={u.id} className="px-3 py-2.5 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {cfg && (
                        <span className={cn("flex items-center gap-1 text-xs font-medium", cfg.color)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                          {cfg.label}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-0.5 text-[10px] text-custom-text-400">
                        <Clock className="h-3 w-3" />
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {u.comment && (
                      <p className="text-xs text-custom-text-300 pl-3.5">{u.comment}</p>
                    )}
                    {u.created_by_display_name && (
                      <p className="text-[10px] text-custom-text-400 pl-3.5">— {u.created_by_display_name}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
