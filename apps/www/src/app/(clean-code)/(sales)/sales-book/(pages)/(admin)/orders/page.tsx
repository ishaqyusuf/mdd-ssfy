import { getSalesPageQueryData } from "@/actions/cached-queries";
import Portal from "@/components/_v1/portal";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";

import OrdersPageClient from "../../_components/orders-page-client";
import { prisma } from "@/db";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales List - gndprodesk.com`,
    });
}
export default async function SalesBookPage({ searchParams }) {
    // const s = await prisma

    // const e = await prisma.siteActionTicket.findFirst({
    //     where: {
    //         event: "deleted",
    //         type: "order",
    //         // createdAt: "2025-03-04T14:44:47.000Z
    //         // description:
    //         meta: {
    //             path: "$.description",
    //             string_contains: "04194PC",
    //             mode: "insensitive",
    //         },
    //     },
    // });
    // console.log({ s });
    // console.log({ e });

    const [queryData] = await Promise.all([
        getSalesPageQueryData({
            "sales.type": "order",
        }),
    ]);
    return (
        <FPage can={["viewOrders"]} title="Orders">
            <Portal nodeId={"navRightSlot"}>
                <NewFeatureBtn href="/sales/orders">Old Site</NewFeatureBtn>
            </Portal>
            <TablePage
                queryData={queryData}
                PageClient={OrdersPageClient}
                searchParams={searchParams}
                filterKey="orders"
            />
        </FPage>
    );
}
