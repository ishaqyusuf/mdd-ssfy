import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { ISalesOrder } from "@/types/sales";
import OrderPrinter from "@/components/_v1/print/order/order-printer";
import SalesProductionTableShell from "@/app/(v1)/(loggedIn)/sales/productions/sales-production-table-shell";
import {
    getSalesProductionsAction,
    prodsDueToday,
} from "@/app/(v1)/(loggedIn)/sales/_actions/sales-production";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    BreadLink,
    ProductionsCrumb,
} from "@/components/_v1/breadcrumbs/links";
import { Metadata } from "next";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import ProductionPageTabs from "@/app/(v2)/(loggedIn)/sales-v2/productions/_components/production-page-tabs";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Sales Production",
    description: "",
};
interface Props {}
export default async function SalesProductionPage(props) {
    const searchParams = await props.searchParams;
    if (process.env.NODE_ENV == "production") redirect(`/sales-v2/productions`);
    const response = await getSalesProductionsAction(
        queryParams(searchParams),
        true,
    );
    const todaysProd = await prodsDueToday(true);
    return (
        <AuthGuard can={["viewOrderProduction"]}>
            <Breadcrumbs>
                <BreadLink isFirst title="Sales" />
                <ProductionsCrumb isLast />
            </Breadcrumbs>
            <ProductionPageTabs />
            <div className="space-y-4 px-8">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Due Today
                        </h2>
                    </div>
                    <div className="flex items-center space-x-2"></div>
                </div>
                <SalesProductionTableShell simple {...todaysProd} />
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Productions
                        </h2>
                    </div>
                    <div className="flex items-center space-x-2"></div>
                </div>
                <SalesProductionTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <OrderPrinter />
            </div>
        </AuthGuard>
    );
}
