import { Metadata } from "next";
import { redirect } from "next/navigation";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import {
    getSalesProductionsAction,
    prodsDueToday,
} from "@/app/(v1)/(loggedIn)/sales/_actions/sales-production";
import SalesProductionTableShell from "@/app/(v1)/(loggedIn)/sales/productions/sales-production-table-shell";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import ProductionPageTabs from "@/app/(v2)/(loggedIn)/sales-v2/productions/_components/production-page-tabs";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { ProductionsCrumb } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import OrderPrinter from "@/components/_v1/print/order/order-printer";

export const metadata: Metadata = {
    title: "Sales Production",
    description: "",
};
interface Props {}
export default async function SalesProductionPage({ searchParams }) {
    // if (env.NODE_ENV == "production")
    redirect(`/sales-book/production-tasks`);
    const response = await getSalesProductionsAction(queryParams(searchParams));

    const todaysProd = await prodsDueToday();
    return (
        <AuthGuard roles={["Production"]}>
            <div className="h-full flex-1 flex-col space-y-4">
                <Breadcrumbs>
                    <ProductionsCrumb isLast />
                </Breadcrumbs>
                <ProductionPageTabs prod />
                <div className="space-y-4 px-8">
                    <PageHeader title="Due Today" />

                    <SalesProductionTableShell simple {...todaysProd} myProd />

                    <PageHeader title="Productions" />
                    <SalesProductionTableShell
                        myProd
                        searchParams={searchParams}
                        {...response}
                    />
                    <OrderPrinter />
                </div>
            </div>
        </AuthGuard>
    );
}
