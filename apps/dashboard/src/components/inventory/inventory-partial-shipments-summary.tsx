"use client";

import { useInventoryPartialShipmentFilterParams } from "@/hooks/use-inventory-partial-shipment-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card } from "@gnd/ui/card";
import { useSuspenseQuery } from "@gnd/ui/tanstack";

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

export function InventoryPartialShipmentsSummary() {
	const trpc = useTRPC();
	const { filters } = useInventoryPartialShipmentFilterParams();
	const { data } = useSuspenseQuery(
		trpc.inventories.salesPartialShipmentQueueSummary.queryOptions(filters),
	);

	return (
		<div className="grid gap-4 md:grid-cols-5">
			<SummaryCard label="Open Lines" value={formatQty(data.totalCount)} />
			<SummaryCard
				label="Available Now"
				value={formatQty(data.availableToShipQty)}
			/>
			<SummaryCard label="Held Lines" value={formatQty(data.heldLineCount)} />
			<SummaryCard label="Remaining" value={formatQty(data.remainingQty)} />
			<SummaryCard label="Inbound" value={formatQty(data.inboundQty)} />
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
