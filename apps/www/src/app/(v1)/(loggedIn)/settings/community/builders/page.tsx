import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { getBuildersAction } from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import BuildersTableShell from "./builders-table-shell";

export const metadata: Metadata = {
    title: "Builders",
};
export default async function BuildersPage({ searchParams }) {
    const response = await getBuildersAction(queryParams(searchParams));
    return (
        <AuthGuard can={["viewBuilders"]}>
            <CommunitySettingsLayoutComponent>
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink isLast title="Builders" />
                </Breadcrumbs>

                <BuildersTableShell searchParams={searchParams} {...response} />
            </CommunitySettingsLayoutComponent>
        </AuthGuard>
    );
}
