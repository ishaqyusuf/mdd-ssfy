import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { queryParams } from "@/app/(v1)/_actions/action-utils";

import ProjectsTableShell from "@/app/(v1)/(loggedIn)/community/projects/components/projects-table-shell";
import { getProjectsAction } from "@/app/(v1)/_actions/community/projects";
import CommunityInstallCostModal from "@/components/_v1/modals/community-install-cost";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Community Costs",
};
export default async function CommunityCostsPage({ searchParams }) {
    const response = await getProjectsAction(queryParams(searchParams));
    return (
        <AuthGuard can={["editProject"]}>
            <CommunitySettingsLayoutComponent>
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink isLast title="Community Cost" />
                </Breadcrumbs>
                <PageHeader title="Community Costs" />

                <ProjectsTableShell
                    cost
                    searchParams={searchParams}
                    {...response}
                />
                <CommunityInstallCostModal />
            </CommunitySettingsLayoutComponent>
        </AuthGuard>
    );
}
