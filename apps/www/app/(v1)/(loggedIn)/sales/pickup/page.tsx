import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { ISalesOrder } from "@/types/sales";
import PageHeader from "@/components/_v1/page-header";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import SalesTabLayout from "@/components/_v1/tab-layouts/sales-tab-layout";

import { Metadata } from "next";
import PickupTableShell from "@/app/(v1)/(loggedIn)/sales/pickup/pickup-table-shell";
import { _getSalesPickup } from "@/app/(v1)/(loggedIn)/sales/_actions/_sales-pickup";
import UpgradeBtn from "./components/upgrade-btn";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
export const metadata: Metadata = {
    title: "Order Pickup",
};
interface Props {}
export default async function SalesPickupPage(props) {
    const searchParams = await props.searchParams;
    const response = await _getSalesPickup(queryParams(searchParams));
    return (
        <AuthGuard can={["viewPickup"]}>
            <SalesTabLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Pickup" />
                </Breadcrumbs>
                <PageHeader title="Sales Pickup" />
                {/* <UpgradeBtn /> */}
                <PickupTableShell<ISalesOrder>
                    searchParams={searchParams}
                    {...response}
                />
            </SalesTabLayout>
        </AuthGuard>
    );
}
