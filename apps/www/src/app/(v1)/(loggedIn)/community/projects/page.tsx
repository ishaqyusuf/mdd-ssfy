import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { Metadata } from "next";
import { IProject } from "@/types/community";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { getProjectsAction } from "@/app/(v1)/_actions/community/projects";
import ProjectsTableShell from "@/app/(v1)/(loggedIn)/community/projects/components/projects-table-shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Projects",
};
interface Props {}
export default async function ProjectsPage({ searchParams }) {
    const response = await getProjectsAction(queryParams(searchParams));
    return (
        <AuthGuard can={["viewProject"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Community" />
                    <BreadLink isLast title="Projects" />
                </Breadcrumbs>

                <ProjectsTableShell<IProject>
                    searchParams={searchParams}
                    {...response}
                />
            </div>
        </AuthGuard>
    );
}
