import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { queryParams } from "@/app/(v1)/_actions/action-utils";

import ModelInstallCostModal from "@/app/(v1)/(loggedIn)/settings/community/community-templates/install-cost-modal/model-install-cost-modal";

import { _bootstrapPivot } from "@/app/(v1)/_actions/community/_community-pivot";
import CommunityModelCostModal from "@/components/_v1/modals/community-model-cost/modal";
import CommunityInstallCostModal from "@/components/_v1/modals/community-install-cost";

import CommunityTemplateTableShell from "./community-templates-table-shell";
import { getCommunityTemplates } from "../_components/home-template";
import { OpenCommunityTemplateModal } from "@/components/open-community-template-modal";

export const metadata: Metadata = {
    title: "Community Templates",
};
export default async function CommunityTemplatesPage(props) {
    const searchParams = await props.searchParams;
    // const histories = await prisma.communityTemplateHistory.findMany({
    //     where: {},
    // });

    const response = await getCommunityTemplates(queryParams(searchParams));
    return (
        <CommunitySettingsLayoutComponent>
            <Breadcrumbs>
                <BreadLink isFirst title="Settings" />
                <BreadLink title="Community" />
                <BreadLink isLast title="Community Templates" />
            </Breadcrumbs>
            <PageHeader
                title="Community Templates"
                // newDialog="communityTemplate"
                Action={OpenCommunityTemplateModal}
            />
            <CommunityTemplateTableShell
                searchParams={searchParams}
                {...response}
            />

            <ModelInstallCostModal community />
            <CommunityModelCostModal />
            <CommunityInstallCostModal />
            {/* <ModelCostCommunityModal /> */}
        </CommunitySettingsLayoutComponent>
    );
}

