import { getSalesEstimates } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";

import { queryParams } from "@/app/(v1)/_actions/action-utils";
import OrderPrinter from "@/components/_v1/print/order/order-printer";

import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import SalesTabLayout from "@/components/_v1/tab-layouts/sales-tab-layout";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Metadata } from "next";
import EstimatesTableShell from "./estimates-table-shell";
import Portal from "@/components/_v1/portal";
import NewFeatureBtn from "@/components/common/new-feature-btn";

export const metadata: Metadata = {
    title: "Sales Quote",
};
interface Props {}

export default async function SalesEstimatesPage(props) {
    const searchParams = await props.searchParams;
    // if (env.NODE_ENV == "production") redirect("/sales/dashboard/quotes");
    const response = await getSalesEstimates(queryParams(searchParams));
    return (
        <AuthGuard can={["viewEstimates"]}>
            <SalesTabLayout>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Quotes" />
                </Breadcrumbs>
                <Portal nodeId={"actionNav"}>
                    <div>
                        <NewFeatureBtn href="/sales-book/quotes">
                            New Site
                        </NewFeatureBtn>
                    </div>
                </Portal>
                <EstimatesTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <OrderPrinter />
            </SalesTabLayout>
        </AuthGuard>
    );
}
