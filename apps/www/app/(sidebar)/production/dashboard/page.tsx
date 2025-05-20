import type { Metadata } from "next";
import DevOnly from "@/_v2/components/common/dev-only";
import { DataTable } from "@/components/examples/block-featured-outline-table";
import ProductionWorkerDashboard from "@/components/production-worker-dashboard";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description: "View assigned jobs and commission information",
};

export default function Page() {
    return (
        <>
            <ProductionWorkerDashboard />
            <DevOnly>
                <DataTable />
            </DevOnly>
        </>
    );
}
