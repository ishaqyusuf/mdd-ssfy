import type { Metadata } from "next";
import DevOnly from "@/_v2/components/common/dev-only";
import { DataTable } from "@/components/examples/block-featured-outline-table";
import ProductionWorkerDashboard from "@/components/production-worker-dashboard";
import { env } from "@/env.mjs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description: "View assigned jobs and commission information",
};

export default function Page() {
    const isProd = env.NEXT_PUBLIC_NODE_ENV === "production";
    return (
        <div className="relative">
            <div
                className={cn(
                    "",
                    isProd &&
                        "inset-0 absolute bg-black/60 z-[999] flex items-center justify-center",
                )}
            >
                <div className="bg-white fixed top-1/2 text-black px-6 py-4 rounded-xl shadow-xl text-xl font-semibold animate-pulse">
                    Coming Soon
                </div>
            </div>

            <ProductionWorkerDashboard />
            <DevOnly>
                <DataTable />
            </DevOnly>
        </div>
    );
}
