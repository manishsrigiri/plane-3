"use client";

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { Plus } from "lucide-react";
import { Button } from "@plane/ui";
import RenderIfVisible from "@/components/core/render-if-visible-HOC";
import { useStore } from "@/hooks/use-store";
import { ProjectInitiativeCreateModal } from "./project-initiative-create-modal";
import { ProjectInitiativeListItem } from "./project-initiative-list-item";

type Props = {
  workspaceSlug: string;
  projectId: string;
};

export const ProjectInitiativesRoot = observer(({ workspaceSlug, projectId }: Props) => {
  const { initiative: initiativeStore } = useStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspaceSlug && projectId) {
      initiativeStore.fetchProjectInitiatives(workspaceSlug, projectId);
    }
  }, [workspaceSlug, projectId]);

  const initiatives = Object.values(initiativeStore.initiativeMap)
    .filter((i) => i.project === projectId)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-custom-border-200">
        <div>
          <h1 className="text-xl font-semibold text-custom-text-100">Initiatives</h1>
          <p className="text-sm text-custom-text-300 mt-0.5">Strategic goals that group Epics in this project</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          prependIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Add initiative
        </Button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4">
        {initiativeStore.loader ? (
          <div className="flex items-center justify-center h-32 text-sm text-custom-text-300">
            Loading initiatives...
          </div>
        ) : initiatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="h-16 w-16 rounded-full bg-custom-background-80 flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <p className="text-sm font-medium text-custom-text-200">No initiatives yet</p>
              <p className="text-xs text-custom-text-300 mt-1">
                Create an initiative to track strategic goals for this project.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              prependIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create your first initiative
            </Button>
          </div>
        ) : (
          <div>
            {initiatives.map((initiative) => (
              <RenderIfVisible
                key={initiative.id}
                root={listRef}
                defaultHeight="72px"
                verticalOffset={200}
                shouldRecordHeights
              >
                <ProjectInitiativeListItem
                  initiative={initiative}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                />
              </RenderIfVisible>
            ))}
          </div>
        )}
      </div>

      <ProjectInitiativeCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
    </div>
  );
});
