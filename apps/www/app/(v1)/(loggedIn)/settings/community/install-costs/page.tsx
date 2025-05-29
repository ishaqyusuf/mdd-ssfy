import { getSettingAction } from "@/app/(v1)/_actions/settings";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { InstallCostForm } from "@/components/_v1/forms/community/install-cost-form";
import CommunitySettingsLayoutComponent from "@/components/_v1/tab-layouts/community-settings-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Install Costs",
};
export default async function InstallCostsPage({}) {
    const data = await getSettingAction("install-price-chart");
    return (
        <div className="">
            <AuthGuard can={["viewProject"]}>
                <CommunitySettingsLayoutComponent>
                    <Breadcrumbs>
                        <BreadLink isFirst title="Settings" />
                        <BreadLink title="Community" />
                        <BreadLink isLast title="Install Cost" />
                    </Breadcrumbs>
                    <InstallCostForm data={data as any} />
                </CommunitySettingsLayoutComponent>
            </AuthGuard>
        </div>
    );
}
