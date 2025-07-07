import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import ModelCostTableShell from "@/components/_v1/shells/model-costs-table-shell";
import ModelCostModal from "@/components/_v1/modals/model-cost-modal";
import ModelInstallCostModal from "@/app/(v1)/(loggedIn)/settings/community/community-templates/install-cost-modal/model-install-cost-modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { getHomeTemplates } from "../_components/home-template";

export const metadata: Metadata = {
    title: "Model Costs",
};
export default async function ModelCosts({ searchParams }) {
    const response = await getHomeTemplates(queryParams(searchParams));
    return (
        <AuthGuard can={["editProject"]}>
            <CommunitySettingsLayoutComponent>
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink isLast title="Model Costs" />
                </Breadcrumbs>
                <PageHeader title="Model Costs" newDialog="modelTemplate" />
                <ModelCostTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <ModelCostModal />
                {/* <ModelTemplateModal /> */}
                <ModelInstallCostModal />
            </CommunitySettingsLayoutComponent>
        </AuthGuard>
    );
}
