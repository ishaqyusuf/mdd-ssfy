import type { Metadata } from "next";

import { ProductionWorkerDashboardV2 } from "@/components/production-v2/shared";

export const metadata: Metadata = {
	title: "Production Dashboard v2",
	description:
		"Worker-first production dashboard with inline detail, note activity, and mobile-responsive expansion.",
};

export default function Page() {
	return <ProductionWorkerDashboardV2 />;
}
