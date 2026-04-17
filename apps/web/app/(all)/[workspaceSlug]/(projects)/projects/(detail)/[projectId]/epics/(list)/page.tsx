"use client";

import { observer } from "mobx-react";
import Head from "next/head";
import { useParams } from "next/navigation";
import { useTranslation } from "@plane/i18n";
import { PageHead } from "@/components/core/page-title";
import { ProjectLayoutRoot } from "@/components/issues/issue-layouts/roots/project-layout-root";
import { useProject } from "@/hooks/store/use-project";

const ProjectEpicsPage = observer(() => {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const { getProjectById } = useProject();

  if (!projectId) return <></>;

  const project = getProjectById(projectId.toString());
  const pageTitle = project?.name ? `${project?.name} - ${t("epic.label", { count: 2 })}` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <Head>
        <title>
          {project?.name} - {t("epic.label", { count: 2 })}
        </title>
      </Head>
      <div className="h-full w-full">
        <ProjectLayoutRoot isEpic />
      </div>
    </>
  );
});

export default ProjectEpicsPage;
