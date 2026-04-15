"use client";

import { DispatchPackingOverview } from "@/components/dispatch-packing-overview";

import { useSalesOverviewSystem } from "../provider";

export function SalesOverviewPackingTab() {
	const {
		state: { overviewId, dispatchId },
	} = useSalesOverviewSystem();

	return (
		<div className="p-1">
			<DispatchPackingOverview
				dispatchId={dispatchId ? Number(dispatchId) : null}
				salesNo={overviewId || null}
			/>
		</div>
	);
}
