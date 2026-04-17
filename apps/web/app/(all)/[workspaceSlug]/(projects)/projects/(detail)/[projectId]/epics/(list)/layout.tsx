"use client";

import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { ProjectIssuesHeader } from "../../issues/(list)/header";
import { ProjectIssuesMobileHeader } from "../../issues/(list)/mobile-header";

export default function ProjectEpicsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader header={<ProjectIssuesHeader />} mobileHeader={<ProjectIssuesMobileHeader />} />
      <ContentWrapper>{children}</ContentWrapper>
    </>
  );
}
