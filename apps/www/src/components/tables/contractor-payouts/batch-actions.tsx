"use client";

import { printContractorPayoutReport } from "@/lib/job-print";
import { BatchAction } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { Button } from "@gnd/ui/button";
import { Printer } from "lucide-react";
import type { Item } from "./columns";

export function BatchActions() {
	const ctx = useTable();
	const selectedRows = ctx.selectedRows ?? [];
	if (!selectedRows.length) return null;

	const selectedIds = selectedRows
		.map((row) => (row.original as Item)?.id)
		.filter((id): id is number => typeof id === "number");

	return (
		<BatchAction>
			<Button
				variant="ghost"
				className="rounded-none"
				onClick={() =>
					printContractorPayoutReport({
						paymentIds: selectedIds,
					})
				}
			>
				<Printer size={12} className="mr-1" />
				Print Report
			</Button>
		</BatchAction>
	);
}
