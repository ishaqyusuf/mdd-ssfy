import { ISalesSetting } from "@/types/post";
import { getSettingAction } from "@/app/(v1)/_actions/settings";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import SalesSettings from "./SalesSettings";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata = {
    title: "Sales Settings",
    description: "",
};
export default async function SalesSettingsPage({ searchParams }) {
    const resp = await getSettingAction<ISalesSetting>("sales-settings");

    if (!resp) return null;
    return (
        <AuthGuard can={["editOrders"]}>
            <div>
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink isLast title="Sales" />
                </Breadcrumbs>
                <SalesSettings data={resp} />
            </div>
        </AuthGuard>
    );
}
