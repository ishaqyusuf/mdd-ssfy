import { getOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    BreadLink,
    EstimatesCrumb,
    OrderViewCrumb,
    ProductionsCrumb,
} from "@/components/_v1/breadcrumbs/links";
import SalesProdSubmitModal from "@/components/_v1/modals/sales-prod-submit-modal";

import OrderPrinter from "@/components/_v1/print/order/order-printer";
import OverviewDetailsSection from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/details-section";
import ItemDetailsSection from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/item-details";

import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { ISalesOrder } from "@/types/sales";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import TimelineSection from "@/app/(v2)/(loggedIn)/sales-v2/overview/components/timeline";

export const metadata: Metadata = {
    title: "Sales Production",
    description: "Order Overview",
};
export default async function SalesProductionPage(props) {
    const params = await props.params;

    const {
        slug
    } = params;

    const order: ISalesOrder = (await getOrderAction(slug)) as any;
    // console.log(order);
    order.ctx = {
        prodPage: true,
    };
    if (!order) return notFound();
    metadata.description = order.orderId;
    return (
        <AuthGuard can={["viewOrderProduction"]}>
            <DataPageShell className="px-8" data={order}>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />

                    <ProductionsCrumb />
                    <OrderViewCrumb slug={order.orderId} isLast />
                </Breadcrumbs>

                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 flex flex-col space-y-4">
                        <OverviewDetailsSection />
                        <ItemDetailsSection />
                    </div>
                    <div className="space-y-4">
                        {/* <PaymentHistory /> */}
                        <TimelineSection />
                    </div>
                </div>
                {/* <ProductionAssignDialog />
                 */}

                <OrderPrinter />
                <SalesProdSubmitModal />
            </DataPageShell>
        </AuthGuard>
    );
}
