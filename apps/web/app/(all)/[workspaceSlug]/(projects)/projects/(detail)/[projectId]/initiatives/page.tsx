"use client";

import { useParams } from "next/navigation";
import { PageHead } from "@/components/core/page-title";
import { ProjectInitiativesRoot } from "@/components/workspace/initiatives/project-initiatives-root";

const ProjectInitiativesPage = () => {
  const { workspaceSlug, projectId } = useParams<{ workspaceSlug: string; projectId: string }>();

  if (!workspaceSlug || !projectId) return null;

  return (
    <>
      <PageHead title="Initiatives" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <ProjectInitiativesRoot workspaceSlug={workspaceSlug} projectId={projectId} />
      </div>
    </>
  );
};

export default ProjectInitiativesPage;
