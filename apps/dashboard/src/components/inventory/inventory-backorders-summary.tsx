"use client";

import { useInventoryBackorderFilterParams } from "@/hooks/use-inventory-backorder-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/card";
import { useSuspenseQuery } from "@gnd/ui/tanstack";

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

export function InventoryBackordersSummary() {
	const trpc = useTRPC();
	const { filters } = useInventoryBackorderFilterParams();
	const { data } = useSuspenseQuery(
		trpc.inventories.salesBackorderQueueSummary.queryOptions(filters),
	);

	return (
		<div className="grid gap-4 md:grid-cols-4">
			<SummaryCard label="Queue Lines" value={formatQty(data.totalCount)} />
			<SummaryCard label="Remaining Qty" value={formatQty(data.remainingQty)} />
			<SummaryCard
				label="Backordered Qty"
				value={formatQty(data.backorderedQty)}
			/>
			<SummaryCard
				label="Inbound / Received"
				value={`${formatQty(data.inboundQty)} / ${formatQty(data.receivedQty)}`}
			/>
		</div>
	);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
	return (
		<Card className="p-4">
			<div className="text-xs uppercase text-muted-foreground">{label}</div>
			<div className="text-2xl font-semibold">{value}</div>
		</Card>
	);
}
