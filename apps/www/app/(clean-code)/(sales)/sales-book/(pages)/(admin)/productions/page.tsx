import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { __isProd } from "@/lib/is-prod-server";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import Portal from "@/components/_v1/portal";
import NewFeatureBtn from "@/components/common/new-feature-btn";
import TablePage from "@/components/tables/table-page";
import ProductionTasksPageClient from "../../_components/production-tasks-page-client";
import { __getSalesOrderNos } from "@/actions/cache/sales-data-query";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Production - gndprodesk.com`,
    });
}
export default async function Page({ searchParams }) {
    const [orderNos] = await Promise.all([__getSalesOrderNos()]);
    return (
        <FPage can={["viewOrders"]} className="" title="Productions">
            <Portal nodeId={"navRightSlot"}>
                <NewFeatureBtn href="/sales-v2/productions">
                    Old Site
                </NewFeatureBtn>
            </Portal>
            <TablePage
                queryData={{
                    "order.no": orderNos,
                }}
                PageClient={ProductionTasksPageClient}
                searchParams={searchParams}
                filterKey="sales-productions"
            />
        </FPage>
    );
}
