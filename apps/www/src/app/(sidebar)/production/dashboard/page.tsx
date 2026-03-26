import type { Metadata } from "next";
import { ProductionWorkspace } from "@/components/production-workspace";

export const metadata: Metadata = {
	title: "Production Worker Dashboard",
	description:
		"Track due work, tomorrow alerts, and your active production queue",
};

export default function Page() {
	return (
		<div className="relative">
			<ProductionWorkspace mode="worker" />
		</div>
	);
}
