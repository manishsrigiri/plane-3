"use client";

import type { KeyboardEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, ChevronDown, Plus, Trash2, Calendar, Target, Layers } from "lucide-react";
import type { ISearchIssueResponse, TInitiativeEpic, TProjectIssuesSearchParams } from "@plane/types";
import { EFileAssetType } from "@plane/types";
import { Button } from "@plane/ui";
import { cn } from "@plane/utils";
import { ExistingIssuesListModal } from "@/components/core/modals/existing-issues-list-modal";
import { RichTextEditor } from "@/components/editor/rich-text";
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useInitiative } from "@/hooks/store/use-initiative";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { WorkspaceService } from "@/plane-web/services";
import { InitiativeService } from "@/services/initiative.service";
import { ProgressBar } from "./progress-bar";

const workspaceService = new WorkspaceService();
const initiativeService = new InitiativeService();

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-400",
  planned: "bg-blue-500",
  in_progress: "bg-orange-500",
  paused: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

type EpicRowProps = {
  epicLink: TInitiativeEpic;
  workspaceSlug: string;
  onRemove: (epicId: string) => void;
  canEdit: boolean;
};

const EpicRow = memo(observer(({ epicLink, workspaceSlug, onRemove, canEdit }: EpicRowProps) => {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const detail = epicLink.epic_detail;
  const epicDetailRoute = `/${workspaceSlug}/projects/${detail.project_id}/epics/${detail.id}/`;
  const navigateToEpic = () => router.push(epicDetailRoute);
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigateToEpic();
    }
  };

  return (
    <div
      className="border border-custom-border-200 rounded-md mb-2 overflow-hidden cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={navigateToEpic}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-custom-background-90">
        <button
          type="button"
          className="flex-shrink-0 text-custom-text-400 hover:text-custom-text-200 cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <span className="flex-shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          Epic
        </span>

        <span className="flex-1 min-w-0 text-sm font-medium text-custom-text-100 truncate">{detail.name}</span>

        <span className="text-xs text-custom-text-300 flex-shrink-0">#{detail.sequence_id}</span>

        {/* Epic sub-issue progress */}
        {detail.sub_issues_count > 0 && (
          <div className="w-24 flex-shrink-0">
            <ProgressBar completed={detail.completed_sub_issues_count ?? 0} total={detail.sub_issues_count} size="sm" />
          </div>
        )}

        <span className="text-xs text-custom-text-400 flex-shrink-0">
          {detail.completed_sub_issues_count ?? 0}/{detail.sub_issues_count} stories
        </span>

        {canEdit && (
          <button
            type="button"
            className="flex-shrink-0 text-custom-text-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(epicLink.epic);
            }}
            title="Remove epic from initiative"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-custom-border-200 bg-custom-background-90 px-6 py-3">
          <Link
            href={epicDetailRoute}
            className="inline-flex items-center gap-1.5 text-xs text-custom-primary-100 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Layers className="h-3 w-3" />
            Open Epic detail (User Stories &amp; Tasks)
          </Link>
        </div>
      )}
    </div>
  );
}));

type Props = {
  workspaceSlug: string;
  initiativeId: string;
};

export const InitiativeDetailRoot = observer(({ workspaceSlug, initiativeId }: Props) => {
  const router = useRouter();
  const initiativeStore = useInitiative();
  const { uploadEditorAsset } = useEditorAsset();
  const { getWorkspaceBySlug } = useWorkspace();
  const [epicsLoaded, setEpicsLoaded] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState<string | undefined>(undefined);
  const [addEpicModalOpen, setAddEpicModalOpen] = useState(false);
  // Visibility-based progress refresh
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id?.toString();
  const initiative = initiativeStore.getInitiativeById(initiativeId);
  const rawEpics = initiativeStore.getInitiativeEpics(initiativeId);
  // Stable reference — only re-sorts when the underlying array identity changes
  const epics = useMemo(() => rawEpics, [rawEpics]);

  useEffect(() => {
    if (!workspaceSlug || !initiativeId) return;
    if (!initiative) {
      initiativeStore.fetchInitiativeById(workspaceSlug, initiativeId);
    } else {
      setDescriptionValue(initiative.description_html ?? "<p></p>");
    }
    initiativeStore.fetchInitiativeEpics(workspaceSlug, initiativeId).then(() => setEpicsLoaded(true));
  }, [workspaceSlug, initiativeId]);

  // Sync description once initiative loads
  useEffect(() => {
    if (initiative && descriptionValue === undefined) {
      setDescriptionValue(initiative.description_html ?? "<p></p>");
    }
  }, [initiative]);

  // Auto-refresh progress every 30s while page is visible
  useEffect(() => {
    if (!workspaceSlug || !initiativeId) return;
    const refresh = () => initiativeStore.refreshProgress(workspaceSlug, initiativeId);
    refreshTimerRef.current = setInterval(refresh, 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [workspaceSlug, initiativeId]);

  const handleRemoveEpic = useCallback(
    async (epicId: string) => {
      await initiativeStore.removeEpicFromInitiative(workspaceSlug, initiativeId, epicId);
    },
    [initiativeStore, workspaceSlug, initiativeId]
  );

  const handleDescriptionChange = useCallback(
    (_: object, html: string) => {
      setDescriptionValue(html);
      initiativeStore.updateInitiative(workspaceSlug, initiativeId, { description_html: html });
    },
    [initiativeStore, workspaceSlug, initiativeId]
  );

  const alreadyLinkedEpicIds = useMemo(() => new Set(epics.map((e) => e.epic)), [epics]);

  const epicSearchCallback = useCallback(
    (params: TProjectIssuesSearchParams) => initiativeService.searchEpics(workspaceSlug, params.search ?? ""),
    [workspaceSlug]
  );

  const handleAddEpics = useCallback(
    async (selected: ISearchIssueResponse[]) => {
      const ids = selected.map((s) => s.id);
      await initiativeStore.addEpicsToInitiative(workspaceSlug, initiativeId, ids);
    },
    [initiativeStore, workspaceSlug, initiativeId]
  );

  if (!initiative && !epicsLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-custom-text-300">Loading initiative...</div>
    );
  }

  if (!initiative) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-sm text-custom-text-300">
        <p>Initiative not found.</p>
        <button
          type="button"
          className="text-custom-primary-100 hover:underline"
          onClick={() => router.push(`/${workspaceSlug}/initiatives/`)}
        >
          Back to Initiatives
        </button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[initiative.status] ?? "bg-gray-400";
  const statusLabel = STATUS_LABELS[initiative.status] ?? initiative.status;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-custom-border-200">
        <button
          type="button"
          className="mb-3 flex items-center gap-1.5 text-xs text-custom-text-300 hover:text-custom-text-200"
          onClick={() => router.push(`/${workspaceSlug}/initiatives/`)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Initiatives
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("h-3 w-3 flex-shrink-0 rounded-full", statusColor)} title={statusLabel} />
            <h1 className="text-xl font-semibold text-custom-text-100">{initiative.name}</h1>
          </div>

          <span className={cn("flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white", statusColor)}>
            {statusLabel}
          </span>
        </div>

        {initiative.description && <p className="mt-1.5 text-sm text-custom-text-300 ml-6">{initiative.description}</p>}

        <div className="mt-3 flex items-center gap-4 ml-6 text-xs text-custom-text-400">
          {initiative.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Start: {new Date(initiative.start_date).toLocaleDateString()}
            </span>
          )}
          {initiative.end_date && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Due: {new Date(initiative.end_date).toLocaleDateString()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {initiative.completed_epic_count ?? 0}/{initiative.epic_count} epic{initiative.epic_count !== 1 ? "s" : ""}{" "}
            done
          </span>
        </div>

        {/* Initiative-level progress bar */}
        {initiative.epic_count > 0 && (
          <div className="mt-3 ml-6 max-w-sm">
            <ProgressBar completed={initiative.completed_epic_count ?? 0} total={initiative.epic_count} size="md" />
          </div>
        )}
      </div>

      {/* Description editor */}
      {workspaceId && descriptionValue !== undefined && (
        <div className="px-6 py-4 border-b border-custom-border-200">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-custom-text-300">Description</h3>
          <RichTextEditor
            editable
            id={`initiative-desc-${initiativeId}`}
            initialValue={descriptionValue}
            value={null}
            workspaceSlug={workspaceSlug}
            workspaceId={workspaceId}
            dragDropEnabled
            onChange={handleDescriptionChange}
            placeholder={() => "Describe this initiative..."}
            searchMentionCallback={async (payload) => workspaceService.searchEntity(workspaceSlug, { ...payload })}
            containerClassName="border-none min-h-[80px]"
            uploadFile={async (blockId, file) => {
              const { asset_id } = await uploadEditorAsset({
                blockId,
                data: {
                  entity_identifier: initiativeId,
                  entity_type: EFileAssetType.INITIATIVE_DESCRIPTION,
                },
                file,
                workspaceSlug,
              });
              return asset_id;
            }}
          />
        </div>
      )}

      {/* Epics list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-custom-text-200 uppercase tracking-wide">Epics</h2>
          <Button
            variant="neutral-primary"
            size="sm"
            prependIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setAddEpicModalOpen(true)}
          >
            Add Epic
          </Button>
        </div>

        {!epicsLoaded ? (
          <div className="flex items-center justify-center h-32 text-sm text-custom-text-300">Loading epics...</div>
        ) : epics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            <Layers className="h-10 w-10 text-custom-text-400" />
            <p className="text-sm font-medium text-custom-text-200">No epics assigned</p>
            <p className="text-xs text-custom-text-300">
              Open an Epic and use &quot;Add to Initiative&quot; to link it here.
            </p>
          </div>
        ) : (
          <div className="group">
            {epics.map((epicLink) => (
              <EpicRow
                key={epicLink.id}
                epicLink={epicLink}
                workspaceSlug={workspaceSlug}
                onRemove={handleRemoveEpic}
                canEdit
              />
            ))}
          </div>
        )}
      </div>

      <ExistingIssuesListModal
        workspaceSlug={workspaceSlug}
        isOpen={addEpicModalOpen}
        handleClose={() => setAddEpicModalOpen(false)}
        searchParams={{ workspace_search: true }}
        handleOnSubmit={handleAddEpics}
        shouldHideIssue={(issue) => alreadyLinkedEpicIds.has(issue.id)}
        workItemSearchServiceCallback={epicSearchCallback}
      />
    </div>
  );
});
