"use client";

import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash-es";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
// plane imports
import type { TIssue, TNameDescriptionLoader } from "@plane/types";
import { EFileAssetType } from "@plane/types";
import { Loader } from "@plane/ui";
// components
import { RichTextEditor } from "@/components/editor/rich-text";
import type { TIssueOperations } from "@/components/issues/issue-detail";
// hooks
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useWorkspace } from "@/hooks/store/use-workspace";
// services
import { WorkspaceService } from "@/plane-web/services";

const workspaceService = new WorkspaceService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  initialValue: string | undefined;
  disabled?: boolean;
  issueOperations: TIssueOperations;
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  containerClassName?: string;
};

export const AcceptanceCriteriaInput: FC<Props> = observer((props) => {
  const { workspaceSlug, projectId, issueId, initialValue, disabled, issueOperations, setIsSubmitting, containerClassName } = props;

  const [localValue, setLocalValue] = useState({ id: issueId, acceptance_criteria_html: initialValue });
  const hasUnsavedChanges = useRef(false);

  const { uploadEditorAsset } = useEditorAsset();
  const { getWorkspaceBySlug } = useWorkspace();
  const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id?.toString();

  const { handleSubmit, reset, control } = useForm<TIssue>({
    defaultValues: { acceptance_criteria_html: initialValue },
  });

  const handleFormSubmit = useCallback(
    async (formData: Partial<TIssue>) => {
      await issueOperations.update(workspaceSlug, projectId, issueId, {
        acceptance_criteria_html: formData.acceptance_criteria_html ?? "<p></p>",
      });
    },
    [workspaceSlug, projectId, issueId, issueOperations]
  );

  useEffect(() => {
    if (!issueId) return;
    reset({ id: issueId, acceptance_criteria_html: initialValue === "" ? "<p></p>" : initialValue });
    setLocalValue({ id: issueId, acceptance_criteria_html: initialValue === "" ? "<p></p>" : initialValue });
    hasUnsavedChanges.current = false;
  }, [initialValue, issueId, reset]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async () => {
      handleSubmit(handleFormSubmit)().finally(() => {
        setIsSubmitting("submitted");
        hasUnsavedChanges.current = false;
      });
    }, 1500),
    [handleSubmit, issueId]
  );

  useEffect(
    () => () => {
      debouncedSave.cancel();
      if (hasUnsavedChanges.current) {
        handleSubmit(handleFormSubmit)()
          .catch(console.error)
          .finally(() => {
            setIsSubmitting("submitted");
            hasUnsavedChanges.current = false;
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!workspaceId) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-custom-text-300 uppercase tracking-wide">Acceptance Criteria</h4>
      {localValue.acceptance_criteria_html ? (
        <Controller
          name="acceptance_criteria_html"
          control={control}
          render={({ field: { onChange } }) => (
            <RichTextEditor
              editable={!disabled}
              id={`acceptance-criteria-${issueId}`}
              initialValue={localValue.acceptance_criteria_html ?? "<p></p>"}
              value={null}
              workspaceSlug={workspaceSlug}
              workspaceId={workspaceId}
              projectId={projectId}
              dragDropEnabled
              onChange={(_description: object, html: string) => {
                setIsSubmitting("submitting");
                onChange(html);
                hasUnsavedChanges.current = true;
                debouncedSave();
              }}
              placeholder={() => "Define acceptance criteria for this user story..."}
              searchMentionCallback={async (payload) =>
                await workspaceService.searchEntity(workspaceSlug ?? "", {
                  ...payload,
                  project_id: projectId ?? "",
                  issue_id: issueId ?? "",
                })
              }
              containerClassName={containerClassName}
              uploadFile={async (blockId, file) => {
                const { asset_id } = await uploadEditorAsset({
                  blockId,
                  data: { entity_identifier: issueId, entity_type: EFileAssetType.ISSUE_DESCRIPTION },
                  file,
                  projectId,
                  workspaceSlug,
                });
                return asset_id;
              }}
            />
          )}
        />
      ) : (
        <Loader>
          <Loader.Item height="80px" />
        </Loader>
      )}
    </div>
  );
});
