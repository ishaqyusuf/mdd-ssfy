import PageShell from "@/components/page-shell";
import { SalesNav } from "@/components/sales-nav";
import { SalesDashboardWorkspace } from "@/components/sales-dashboard/workspace";
import { HydrateClient } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default function SalesDashboardPage() {
    return (
        <PageShell className="p-3 sm:p-4 md:p-6 lg:p-8">
            <HydrateClient>
                <PageTitle>Sales Dashboard</PageTitle>
                <SalesDashboardWorkspace />
                <SalesNav />
            </HydrateClient>
        </PageShell>
    );
}
