import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";

import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { queryParams } from "@/app/(v1)/_actions/action-utils";

import HomeTemplatesTableShell from "@/components/_v1/shells/home-templates-table-shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { getHomeTemplates } from "../_components/home-template";

export const metadata: Metadata = {
    title: "Builders",
};
export default async function ModelTemplatesPage({ searchParams }) {
    const response = await getHomeTemplates(queryParams(searchParams));
    return (
        <AuthGuard can={["editProject"]}>
            <CommunitySettingsLayoutComponent>
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink isLast title="Model Templates" />
                </Breadcrumbs>
                <PageHeader title="Model Templates" newDialog="modelTemplate" />
                <HomeTemplatesTableShell
                    searchParams={searchParams}
                    {...response}
                />
                {/* <ModelTemplateModal /> */}
            </CommunitySettingsLayoutComponent>
        </AuthGuard>
    );
}
