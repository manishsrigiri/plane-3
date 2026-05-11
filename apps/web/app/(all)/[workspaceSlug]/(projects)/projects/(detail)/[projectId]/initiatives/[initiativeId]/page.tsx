"use client";

import { useParams } from "next/navigation";
import { PageHead } from "@/components/core/page-title";
import { ProjectInitiativeDetailRoot } from "@/components/workspace/initiatives/project-initiative-detail-root";

const ProjectInitiativeDetailPage = () => {
  const { workspaceSlug, projectId, initiativeId } = useParams<{
    workspaceSlug: string;
    projectId: string;
    initiativeId: string;
  }>();

  if (!workspaceSlug || !projectId || !initiativeId) return null;

  return (
    <>
      <PageHead title="Initiative" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <ProjectInitiativeDetailRoot
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          initiativeId={initiativeId}
        />
      </div>
    </>
  );
};

export default ProjectInitiativeDetailPage;
