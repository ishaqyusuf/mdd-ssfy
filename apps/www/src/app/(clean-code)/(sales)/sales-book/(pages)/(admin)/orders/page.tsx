import { getSalesPageQueryData } from "@/actions/cached-queries";
import Portal from "@/components/_v1/portal";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";

import OrdersPageClient from "../../_components/orders-page-client";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales List - gndprodesk.com`,
    });
}
export default async function SalesBookPage(props) {
    const searchParams = await props.searchParams;

    const [queryData] = await Promise.all([
        getSalesPageQueryData({
            "sales.type": "order",
        }),
    ]);
    return (
        <FPage can={["viewOrders"]} title="Orders">
            <TablePage
                queryData={queryData}
                PageClient={OrdersPageClient}
                searchParams={searchParams}
                filterKey="orders"
            />
        </FPage>
    );
}

