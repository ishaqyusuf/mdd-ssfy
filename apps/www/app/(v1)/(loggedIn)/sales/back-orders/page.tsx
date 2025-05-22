import { getSalesOrder } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import OrdersTableShell from "@/app/(v1)/(loggedIn)/sales/orders/components/orders-table-shell";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { ISalesOrder } from "@/types/sales";
import OrderPrinter from "@/components/_v1/print/order/order-printer";
import { Metadata } from "next";
import PageHeader from "@/components/_v1/page-header";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import SalesTabLayout from "@/components/_v1/tab-layouts/sales-tab-layout";
import { _restoreSalesOrder } from "@/app/(v1)/_actions/fix/restore-sales-order";
import { _mergeConflictCustomers } from "@/app/(v1)/_actions/fix/merge-conflict-customer";
import BackOrderModal from "@/components/_v1/modals/sales/back-order-modal";

import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Back Orders",
};
interface Props {}
export default async function BackOrdersPage(props) {
    const searchParams = await props.searchParams;
    // await _restoreSalesOrder();
    const response = await getSalesOrder({
        ...queryParams(searchParams),
        _backOrder: true,
    });
    return (
        <SalesTabLayout query={searchParams}>
            <Breadcrumbs>
                <BreadLink isFirst title="Sales" />
                <BreadLink isLast title="Back Orders" />
            </Breadcrumbs>
            <PageHeader
                title="Back Orders"
                newLink="/sales/order/new/form"
                permissions={["editOrders"]}
            />
            <AuthGuard can={["editOrders"]}>
                {/* <OrdersTableShell searchParams={searchParams} {...response} /> */}
            </AuthGuard>
            <OrderPrinter />

            <BackOrderModal />
        </SalesTabLayout>
    );
}
