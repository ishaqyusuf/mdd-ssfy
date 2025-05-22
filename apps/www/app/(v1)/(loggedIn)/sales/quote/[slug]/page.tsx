import { getOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    EstimatesCrumb,
    OrderViewCrumb,
} from "@/components/_v1/breadcrumbs/links";
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
    title: "Order Overview",
    description: "Order Overview",
};
export default async function EstimateViewPage(props) {
    const params = await props.params;

    const {
        slug
    } = params;

    const order: ISalesOrder = (await getOrderAction(slug)) as any;
    if (!order) return notFound();
    metadata.description = order.orderId;
    return (
        <AuthGuard can={["viewEstimates"]}>
            <DataPageShell className="px-8" data={order}>
                <Breadcrumbs>
                    <EstimatesCrumb isFirst />
                    <OrderViewCrumb slug={order.orderId} isLast />
                </Breadcrumbs>

                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 flex flex-col space-y-4">
                        <OverviewDetailsSection estimate />
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
            </DataPageShell>
        </AuthGuard>
    );
}
