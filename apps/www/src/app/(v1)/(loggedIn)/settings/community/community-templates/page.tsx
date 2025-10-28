import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { queryParams } from "@/app/(v1)/_actions/action-utils";

import { _bootstrapPivot } from "@/app/(v1)/_actions/community/_community-pivot";

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

            {/* <ModelCostCommunityModal /> */}
        </CommunitySettingsLayoutComponent>
    );
}

