import { getSalesOverview } from "../_actions/get-sales-overview";
import OverviewShell from "../components/overview-shell";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import OrderPrinter from "@/components/_v1/print/order/order-printer";
import DeletePaymentPrompt from "@/components/_v1/modals/delete-payment-prompt";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { ISalesType } from "@/types/sales";
import { prisma } from "@/db";

export async function generateMetadata({ params, searchParams }) {
    const [type, slug] = params.typeAndSlug;
    const title = `${type} | ${slug}`;
    return {
        title,
    };
}

export default async function SalesOverviewPage({ params: { typeAndSlug } }) {
    const [type, slug]: [ISalesType, string] = typeAndSlug;

    const data = getSalesOverview({ type, slug });

    return (
        <AuthGuard can={["viewOrders"]}>
            <div className="">
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink title="Orders" link="/sales/orders" />
                </Breadcrumbs>
                <OverviewShell data={data} />
                <OrderPrinter />
                <DeletePaymentPrompt />
            </div>
        </AuthGuard>
    );
}
