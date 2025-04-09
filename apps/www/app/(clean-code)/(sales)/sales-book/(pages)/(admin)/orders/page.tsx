import Portal from "@/components/_v1/portal";
import { composeFilter } from "@/components/(clean-code)/data-table/filter-command/filters";
import { dataOptions } from "@/components/(clean-code)/data-table/query-options";
import { searchParamsCache } from "@/components/(clean-code)/data-table/search-params";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import { prisma } from "@/db";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";
import { getQueryClient } from "@/providers/get-query-client";

import OrdersPageClient from "../../_components/orders-page-client";
import { getSalesPageQueryDataDta } from "../../../../_common/data-access/sales-page-query-data";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales List - gndprodesk.com`,
    });
}
export default async function SalesBookPage({ searchParams }) {
    return (
        <FPage can={["viewOrders"]} title="Orders">
            <Portal nodeId={"navRightSlot"}>
                <NewFeatureBtn href="/sales/orders">Old Site</NewFeatureBtn>
            </Portal>
            <TablePage
                queryDataPromise={getSalesPageQueryDataDta()}
                PageClient={OrdersPageClient}
                searchParams={searchParams}
                filterKey="orders"
            />
        </FPage>
    );
}
