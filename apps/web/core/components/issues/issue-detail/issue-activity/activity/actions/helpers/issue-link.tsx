"use client";

import type { FC } from "react";
import Link from "next/link";
// hooks
import { Tooltip } from "@plane/propel/tooltip";
import type { IIssueActivity } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { usePlatformOS } from "@/hooks/use-platform-os";
// ui

type TIssueLink = {
  activityId: string;
};

export const IssueLink: FC<TIssueLink> = (props) => {
  const { activityId } = props;
  // hooks
  const {
    activity: { getActivityById },
  } = useIssueDetail();
  const { isMobile } = usePlatformOS();
  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  const workItemLink = generateWorkItemLink({
    workspaceSlug: activity.workspace_detail?.slug,
    projectId: activity.project,
    issueId: activity.issue,
    projectIdentifier: activity.project_detail.identifier,
    sequenceId: activity.issue_detail.sequence_id,
    isEpic:
      activity.field === "epic" ||
      !!(activity.issue_detail as unknown as NonNullable<IIssueActivity["issue_detail"]> & { is_epic?: boolean })
        ?.is_epic,
  });
  return (
    <Tooltip
      tooltipContent={activity.issue_detail ? activity.issue_detail.name : "This work item has been deleted"}
      isMobile={isMobile}
    >
      <Link
        aria-disabled={activity.issue === null}
        href={`${activity.issue_detail ? workItemLink : "#"}`}
        className="inline-flex items-center gap-1 font-medium text-custom-text-100 hover:underline"
      >
        {activity.issue_detail
          ? `${activity.project_detail.identifier}-${activity.issue_detail.sequence_id}`
          : "Work items"}{" "}
        <span className="font-normal">{activity.issue_detail?.name}</span>
      </Link>
    </Tooltip>
  );
};
