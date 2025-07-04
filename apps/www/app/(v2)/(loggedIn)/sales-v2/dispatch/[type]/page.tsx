import { capitalizeFirstLetter } from "@/lib/utils";
import AuthGuard from "../../../_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import DispatchTable from "./dispatch-table";
import { getDispatchSales } from "../action";
import PageHeader from "@/components/_v1/page-header";
import SalesTabLayout from "@/components/_v1/tab-layouts/sales-tab-layout";

export async function generateMetadata({ searchParams, params }) {
    return {
        title: `gndprodesk - ${capitalizeFirstLetter(params.type)}`,
    };
}

export default async function DispatchPage({ searchParams, params }) {
    const title = capitalizeFirstLetter(params.type);
    const promise = getDispatchSales(params.type, searchParams);
    return (
        <SalesTabLayout>
            <AuthGuard
                can={[
                    params.type == "delivery" ? "viewDelivery" : "viewPickup",
                ]}
            >
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink title={"Orders"} link="/sales/orders" />
                    <BreadLink title={title} isLast />
                </Breadcrumbs>
                <PageHeader
                    title={title}
                    // newLink="/sales/edit/order/new"
                    // Action={NewSalesBtn}
                    // permissions={["editOrders"]}
                />
                <DispatchTable promise={promise} params={params} />
            </AuthGuard>
        </SalesTabLayout>
    );
}
