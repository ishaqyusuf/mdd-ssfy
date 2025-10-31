import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { getBuildersAction } from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import BuildersTableShell from "@/app/(v1)/(loggedIn)/settings/community/builders/builders-table-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const metadata: Metadata = {
    title: "Builders",
};
export default async function BuildersPage(props) {
    const searchParams = await props.searchParams;
    const response = await getBuildersAction(queryParams(searchParams));
    return (
        <AuthGuard can={["viewBuilders"]}>
            <PageTitle>Builders</PageTitle>
            <BuildersTableShell searchParams={searchParams} {...response} />
        </AuthGuard>
    );
}

