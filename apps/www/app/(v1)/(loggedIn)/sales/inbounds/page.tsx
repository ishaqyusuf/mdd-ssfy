import { queryParams } from "@/app/(v1)/_actions/action-utils";

import { getOrderableItemsCount } from "@/app/(v1)/_actions/sales-inbound/get-orderable-items";
import { _getInboundOrders } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import InboundOrdersTableShell from "@/components/_v1/shells/inbound-orders-table-shell";
import InboundLayout from "@/components/_v1/tab-layouts/inbound-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Inbounds Orders",
};
export default async function InboundPage(props) {
    const searchParams = await props.searchParams;
    const response = await _getInboundOrders(queryParams(searchParams));
    const op = await getOrderableItemsCount();
    return (
        <InboundLayout>
            <Breadcrumbs>
                <BreadLink isFirst title="Inbounds" />
                <BreadLink isLast title="Inbound Orders" />
            </Breadcrumbs>
            <PageHeader
                title="Inbound Orders"
                // buttonText={`New (${op})`}
                // newLink={"/sales/inbound/new/form"}
            />
            <InboundOrdersTableShell
                searchParams={searchParams}
                {...response}
            />
        </InboundLayout>
    );
}
