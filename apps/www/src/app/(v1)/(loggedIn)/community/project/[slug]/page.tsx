import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";
import { ExtendedHome, IProject } from "@/types/community";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { getProjectsAction } from "@/app/(v1)/_actions/community/projects";
import ProjectModal from "@/components/_v1/modals/project-modal";
import { getProjectHomesAction } from "@/app/(v1)/_actions/community/home";
import { openModal } from "@/lib/modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import HomesTableShell from "../../units/homes-table-shell";
import AddBtn from "../../units/add-button";

export const metadata: Metadata = {
    title: "Projects",
};
interface Props {}
export default async function ProjectHomesPage({ searchParams, params }) {
    const { project, ...response } = (await getProjectHomesAction(
        queryParams({ ...searchParams, _projectSlug: params.slug })
    )) as any;
    metadata.title = `${project.title} | Homes`;

    return (
        <AuthGuard can={["viewProject"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink link="/community/projects" title="Projects" />
                    <BreadLink link="/community/units" title="All Units" />
                    <BreadLink title={project.title} isLast />
                </Breadcrumbs>
                <PageHeader
                    title={project.title}
                    subtitle={project?.builder?.name}
                    Action={AddBtn}
                    modalData={{ projectId: project.id }}
                />
                <HomesTableShell<ExtendedHome>
                    projectView
                    data={response.data as any}
                    pageInfo={response.pageInfo}
                />
            </div>
        </AuthGuard>
    );
}
