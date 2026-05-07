"use client";

import type { FC } from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/navigation";
import { ChevronRight, MinusCircle } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
import { ControlLink, CustomMenu } from "@plane/ui";
import { cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useWorkItemType } from "@/hooks/store/use-work-item-type";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// types
import type { TIssueOperations } from "../root";
import { IssueParentSiblings } from "./siblings";

export type TIssueParentDetail = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issue: TIssue;
  issueOperations: TIssueOperations;
};

type TAncestor = {
  issue: TIssue;
  tierLabel: string;
};

const TIER_COLORS: Record<string, string> = {
  Initiative: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Epic: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "User Story": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Task: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const IssueParentDetail: FC<TIssueParentDetail> = observer((props) => {
  const { workspaceSlug, projectId, issueId, issue, issueOperations } = props;
  const router = useRouter();
  const { t } = useTranslation();
  const { issueMap } = useIssues();
  const { getProjectStates } = useProjectState();
  const { handleRedirection } = useIssuePeekOverviewRedirection();
  const { isMobile } = usePlatformOS();
  const { getProjectIdentifierById } = useProject();
  const workItemTypeStore = useWorkItemType();

  // Walk up the ancestor chain (max 5 levels to avoid infinite loops)
  const ancestors: TAncestor[] = [];
  let current: TIssue | undefined = issue;
  let depth = 0;
  while (current?.parent_id && depth < 5) {
    const parent: TIssue | undefined = issueMap?.[current.parent_id];
    if (!parent) break;
    const typeName = parent.type_id
      ? workItemTypeStore.getTypeById(parent.type_id)?.name ?? (parent.is_epic ? "Epic" : "Task")
      : parent.is_epic
        ? "Epic"
        : "Task";
    ancestors.unshift({ issue: parent, tierLabel: typeName });
    current = parent;
    depth++;
  }

  if (ancestors.length === 0) return <></>;

  const directParent = ancestors[ancestors.length - 1];
  const directParentIssue = directParent.issue;
  const isParentEpic = directParentIssue?.is_epic;
  const projectIdentifier = getProjectIdentifierById(directParentIssue?.project_id);

  const issueParentState = getProjectStates(directParentIssue?.project_id)?.find(
    (s) => s?.id === directParentIssue?.state_id
  );
  const stateColor = issueParentState?.color ?? undefined;

  const getWorkItemHref = (anc: TIssue) =>
    generateWorkItemLink({
      workspaceSlug,
      projectId: anc.project_id,
      issueId: anc.id,
      projectIdentifier: getProjectIdentifierById(anc.project_id),
      sequenceId: anc.sequence_id,
      isEpic: anc.is_epic,
    });

  return (
    <>
      {/* Full ancestor breadcrumb trail */}
      <div className="mb-5 flex w-full flex-wrap items-center gap-1 rounded-md border border-custom-border-300 bg-custom-background-80 px-2.5 py-1.5 text-xs">
        {ancestors.map((anc, idx) => {
          const isLast = idx === ancestors.length - 1;
          const href = getWorkItemHref(anc.issue);
          const tierColor = TIER_COLORS[anc.tierLabel] ?? "bg-custom-background-90 text-custom-text-300";

          return (
            <span key={anc.issue.id} className="flex items-center gap-1">
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", tierColor)}>
                {anc.tierLabel}
              </span>
              <ControlLink
                href={href}
                onClick={() => {
                  if (anc.issue.is_epic) router.push(href);
                  else handleRedirection(workspaceSlug, anc.issue, isMobile);
                }}
                className="flex items-center gap-1.5 hover:underline"
              >
                {isLast && (
                  <span className="block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: stateColor }} />
                )}
                {isLast && directParentIssue.project_id && (
                  <IssueIdentifier
                    projectId={directParentIssue.project_id}
                    issueId={directParentIssue.id}
                    textContainerClassName="text-xs text-custom-text-200"
                  />
                )}
                <span className="max-w-[200px] truncate text-custom-text-100">
                  {(anc.issue.name ?? "").substring(0, 60)}
                </span>
              </ControlLink>

              {!isLast && <ChevronRight className="h-3 w-3 flex-shrink-0 text-custom-text-400" />}
            </span>
          );
        })}

        {/* Remove parent action on direct parent */}
        <CustomMenu ellipsis optionsClassName="p-1.5" className="ml-auto">
          <div className="border-b border-custom-border-300 text-xs font-medium text-custom-text-200 pb-1 mb-1">
            {t("issue.sibling.label")}
          </div>
          <IssueParentSiblings
            workspaceSlug={workspaceSlug}
            currentIssue={issue}
            parentIssue={directParentIssue}
          />
          <CustomMenu.MenuItem
            onClick={() => issueOperations.update(workspaceSlug, projectId, issueId, { parent_id: null })}
            className="flex items-center gap-2 py-2 text-red-500"
          >
            <MinusCircle className="h-4 w-4" />
            <span>{t("issue.remove.parent.label")}</span>
          </CustomMenu.MenuItem>
        </CustomMenu>
      </div>
    </>
  );
});
