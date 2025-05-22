import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { Metadata } from "next";
import { prisma } from "@/db";
import { redirect } from "next/navigation";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import LoadDelivery from "@/components/_v1/sales/load-delivery/load-delivery";
import InspectBackOrderModal from "@/components/_v1/modals/sales/inspect-back-order-modal";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
export const metadata: Metadata = {
    title: "Create Back Order",
};
interface Props {}
export default async function CreateBackOrderPage(props) {
    const searchParams = await props.searchParams;
    const orderIds = searchParams.orderIds?.split(",");
    if (!orderIds.length) redirect("/sales/orders");
    const orders = await prisma.salesOrders.findMany({
        where: {
            slug: {
                in: orderIds,
            },
            deletedAt: null,
        },
        include: {
            items: true,
            customer: true,
            shippingAddress: true,
        },
    });
    const data = { orders, action: "create" };
    return (
        <DataPageShell data={data} className="sm:px-8 space-y-4">
            <Breadcrumbs>
                <BreadLink isFirst title="Sales" />
                <BreadLink title="Delivery" link={"/sales/delivery"} />
                <BreadLink isLast title="Loading" />
            </Breadcrumbs>
            <AuthGuard can={["editOrders"]}>
                <LoadDelivery title={"Create"} />
                <InspectBackOrderModal />
            </AuthGuard>
        </DataPageShell>
    );
}
