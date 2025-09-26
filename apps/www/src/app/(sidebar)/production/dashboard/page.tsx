import type { Metadata } from "next";
import { Env } from "@/components/env";
import { DataTable as BlockFeaturedOutlineTable } from "@/components/examples/block-featured-outline-table";
import ProductionWorkerDashboard from "@/components/production-worker-dashboard";
import { _role } from "@/components/sidebar/links";
import { batchPrefetch } from "@/trpc/server";
import { DataTable } from "@/components/tables/sales-production/data-table";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description: "View assigned jobs and commission information",
};

export default function Page() {
    batchPrefetch([
        // trp
    ]);
    return (
        <div className="relative">
            <PageTitle>Production</PageTitle>
            <DataTable workerMode />
            <Env isDev>
                <ProductionWorkerDashboard />
                <BlockFeaturedOutlineTable />
            </Env>
        </div>
    );
}
