import type { Metadata } from "next";
import ProductionWorkerDashboard from "@/components/production-worker-dashboard";

export const metadata: Metadata = {
    title: "Production Worker Dashboard",
    description: "View assigned jobs and commission information",
};

export default function Page() {
    return <ProductionWorkerDashboard />;
}

