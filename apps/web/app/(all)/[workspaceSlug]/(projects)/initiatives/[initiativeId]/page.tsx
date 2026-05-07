"use client";

import { useParams } from "next/navigation";
import { PageHead } from "@/components/core/page-title";
import { InitiativeDetailRoot } from "@/components/workspace/initiatives";

const InitiativeDetailPage = () => {
  const { workspaceSlug, initiativeId } = useParams();

  if (!workspaceSlug || !initiativeId) return null;

  return (
    <>
      <PageHead title="Initiative" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <InitiativeDetailRoot
          workspaceSlug={workspaceSlug as string}
          initiativeId={initiativeId as string}
        />
      </div>
    </>
  );
};

export default InitiativeDetailPage;
