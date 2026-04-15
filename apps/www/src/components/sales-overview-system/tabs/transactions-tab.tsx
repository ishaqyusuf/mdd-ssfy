"use client";

import { TransactionsTab } from "@/components/sheets/customer-overview-sheet/transactions-tab";

import { useSalesOverviewSystem } from "../provider";

export function SalesOverviewTransactionsTab() {
	const {
		state: { overviewId },
	} = useSalesOverviewSystem();

	return (
		<div className="p-1">
			<TransactionsTab salesId={overviewId || undefined} />
		</div>
	);
}
