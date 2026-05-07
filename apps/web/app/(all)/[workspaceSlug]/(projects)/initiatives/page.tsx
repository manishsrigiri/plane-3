"use client";

import { useParams } from "next/navigation";
import { PageHead } from "@/components/core/page-title";
import { InitiativesRoot } from "@/components/workspace/initiatives";

const InitiativesPage = () => {
  const { workspaceSlug } = useParams();

  if (!workspaceSlug) return null;

  return (
    <>
      <PageHead title="Initiatives" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <InitiativesRoot workspaceSlug={workspaceSlug as string} />
      </div>
    </>
  );
};

export default InitiativesPage;
