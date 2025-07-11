import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { __isProd } from "@/lib/is-prod-server";
import ProductionTasksPageClient from "../_components/production-tasks-page-client";
import TablePage from "@/components/tables/table-page";
import { __getSalesOrderNos } from "@/actions/cache/sales-data-query";

export async function generateMetadata({}) {
    return constructMetadata({
        title: `Sales Production - gndprodesk.com`,
    });
}
export default async function SalesBookPage(props) {
    const searchParams = await props.searchParams;
    const [orderNos] = await Promise.all([__getSalesOrderNos()]);
    return (
        <AuthGuard can={["viewProduction"]}>
            <FPage className="" title="Productions">
                <TablePage
                    queryData={{
                        "order.no": orderNos,
                    }}
                    PageClient={ProductionTasksPageClient}
                    searchParams={searchParams}
                    filterKey="production-tasks"
                />
            </FPage>
        </AuthGuard>
    );
}
