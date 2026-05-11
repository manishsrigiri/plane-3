"use client";
import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useStore } from "@/hooks/use-store";

export const WorkspaceContentWrapper = observer(({ children }: { children: React.ReactNode }) => {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { initiative: initiativeStore } = useStore();

  useEffect(() => {
    if (workspaceSlug) initiativeStore.fetchInitiatives(workspaceSlug);
  }, [workspaceSlug]);

  return (
    <div className="flex relative size-full overflow-hidden bg-custom-background-90 rounded-lg transition-all ease-in-out duration-300">
      <div className="size-full p-2 flex-grow transition-all ease-in-out duration-300 overflow-hidden">{children}</div>
    </div>
  );
});
