import PageShell from "@/_v2/components/page-shell";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { DeliveryOption } from "@/types/sales";
import { Metadata } from "next";
import SalesTab from "../../_components/sales-tab";
import PageHeader from "@/components/_v1/page-header";
import { getDispatchSales } from "../_actions/get-dispatch-sales";
import DispatchTableShell from "./dispatch-table-shell";
import PageAction from "../_components/page-action";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Delivery | GND",
};

export default async function DeliveryPage({ searchParams, params }) {
    const type = params.type as DeliveryOption;
    const promise = getDispatchSales({
        ...searchParams,
        type,
    });
    return (
        <AuthGuard can={["editDelivery"]}>
            <PageShell>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink link="/sales/orders" title="Orders" />
                    <BreadLink isLast title={type} />
                </Breadcrumbs>
                <SalesTab />
                <PageHeader Action={PageAction} title={type} />
                <DispatchTableShell promise={promise} type={type} />
            </PageShell>
        </AuthGuard>
    );
}
