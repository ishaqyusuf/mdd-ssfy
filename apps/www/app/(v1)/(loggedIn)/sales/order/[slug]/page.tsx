import { getOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink, OrderViewCrumb } from "@/components/_v1/breadcrumbs/links";
import DeletePaymentPrompt from "@/components/_v1/modals/delete-payment-prompt";

import OrderPrinter from "@/components/_v1/print/order/order-printer";
import CostBreakdown from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/cost-breakdown";
import OverviewDetailsSection from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/details-section";
import PaymentHistory from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/payment-history";
import TabbedItemEmailOverview from "@/app/(v1)/(loggedIn)/sales/order/[slug]/components/tabbed-item-email-overview";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SalesOverview } from "./type";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import TimelineSection from "@/app/(v2)/(loggedIn)/sales-v2/overview/components/timeline";
import { prisma } from "@/db";

export const metadata: Metadata = {
    title: "Order Overview",
    description: "Order Overview",
};

export default async function SalesOrderPage(props) {
    const params = await props.params;

    const {
        slug
    } = params;

    const s = await prisma.salesOrders.findFirst({
        where: {
            id: 3263,
        },
        select: {
            payments: {
                where: {
                    deletedAt: {},
                },
                select: {
                    id: true,
                },
            },
        },
    });
    const order: SalesOverview = (await getOrderAction(slug)) as any;
    if (!order) return notFound();
    metadata.description = order.orderId;
    if (order.isDyke) redirect(`/sales-v2/overview/order/${slug}`);
    return (
        <AuthGuard can={["editOrders"]}>
            <DataPageShell className="sm:px-8" data={order}>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink title="Orders" link="/sales/orders" />
                    <OrderViewCrumb slug={order.orderId} isLast />
                </Breadcrumbs>

                <div className="grid sm:grid-cols-3 gap-4 ">
                    <div className="sm:col-span-2 max-sm:divide-y flex flex-col space-y-4">
                        <OverviewDetailsSection />
                        {/* <ItemDetailsSection /> */}
                        <TabbedItemEmailOverview />
                    </div>
                    <div className="space-y-4 max-sm:divide-y">
                        <CostBreakdown />
                        <PaymentHistory />
                        <TimelineSection />
                    </div>
                </div>

                <OrderPrinter />
                <DeletePaymentPrompt />
            </DataPageShell>
        </AuthGuard>
    );
}
