import { redirect } from "next/navigation";

import { getAppDownloadSettingAction } from "@/app-deps/(v1)/_actions/settings";
import { serverSession } from "@/app-deps/(v1)/_actions/utils";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageShell from "@/components/page-shell";
import MobileAppSettingsForm from "./MobileAppSettingsForm";

export const metadata = {
    title: "Mobile App Settings",
    description: "",
};

export default async function MobileAppSettingsPage() {
    const session = await serverSession();

    if (session?.role?.name?.toLowerCase() !== "super admin") {
        redirect("/");
    }

    const data = await getAppDownloadSettingAction();

    return (
        <PageShell>
            <div className="space-y-4">
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink isLast title="Mobile App" />
                </Breadcrumbs>
                <MobileAppSettingsForm data={data} />
            </div>
        </PageShell>
    );
}
