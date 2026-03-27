import type { Metadata } from "next";
import { ProductionWorkspace } from "@/components/production-workspace";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description:
        "Track due work, tomorrow alerts, and your active production queue",
};

export default function Page() {
    redirect("/production/dashboard/v2"); // Temporary redirect to the new production page while we transition
    return (
        <div className="relative">
            <ProductionWorkspace mode="worker" />
        </div>
    );
}

