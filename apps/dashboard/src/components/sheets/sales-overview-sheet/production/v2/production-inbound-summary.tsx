"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import { useMemo } from "react";

import { useProduction } from "../../context";

export function ProductionInboundSummary() {
	const production = useProduction();
	const trpc = useTRPC();
	const salesOrderId = Number(production.data?.orderId || 0);
	const assignedItemIds = useMemo(
		() =>
			new Set(
				(production.data?.items || [])
					.filter(
						(item) => Number(item.analytics?.stats?.prodAssigned?.qty || 0) > 0,
					)
					.map((item) => item.itemId),
			),
		[production.data?.items],
	);
	const materialsQuery = useQuery(
		trpc.sales.productionMaterials.queryOptions(
			{ salesOrderId },
			{
				enabled: salesOrderId > 0 && assignedItemIds.size > 0,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);

	if (!salesOrderId || assignedItemIds.size === 0) return null;
	if (materialsQuery.isPending) {
		return <Skeleton className="h-28 rounded-lg" />;
	}
	if (materialsQuery.isError || materialsQuery.data?.state === "unavailable") {
		return (
			<section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
				<div className="flex items-start gap-3">
					<Icons.AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
					<div>
						<h3 className="font-semibold">Inbound information unavailable</h3>
						<p className="mt-1 text-sm text-amber-900">
							Confirm material arrival with an administrator before starting
							affected work.
						</p>
					</div>
				</div>
			</section>
		);
	}

	const inboundMaterials = (materialsQuery.data?.materials || []).filter(
		(material) =>
			material.salesItemId != null &&
			assignedItemIds.has(material.salesItemId) &&
			material.openInboundQty > 0,
	);
	if (!inboundMaterials.length) return null;

	return (
		<section className="overflow-hidden rounded-lg border border-sky-200 bg-sky-50/70">
			<div className="flex items-start justify-between gap-3 border-b border-sky-200 px-4 py-3">
				<div className="flex min-w-0 items-start gap-3">
					<Icons.Truck className="mt-0.5 size-5 shrink-0 text-sky-700" />
					<div className="min-w-0">
						<h3 className="font-semibold text-sky-950">Inbound materials</h3>
						<p className="mt-0.5 text-sm text-sky-800">
							Check where materials are coming from and when they should arrive.
						</p>
					</div>
				</div>
				<Badge className="shrink-0 bg-sky-700 text-white hover:bg-sky-700">
					{inboundMaterials.length} incoming
				</Badge>
			</div>
			<div className="divide-y divide-sky-200">
				{inboundMaterials.map((material, index) => (
					<div
						key={`${material.salesItemId}-${material.componentId ?? index}`}
						className="grid gap-3 bg-background/75 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.7fr)_minmax(8rem,0.7fr)]"
					>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-foreground">
								{material.name}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{material.openInboundQty} expected inbound
							</p>
						</div>
						<InboundFact
							label="Order from"
							value={material.supplierName || "Supplier not set"}
						/>
						<InboundFact
							label="Arrival"
							value={
								material.expectedAt
									? formatDate(material.expectedAt)
									: "Not scheduled"
							}
						/>
					</div>
				))}
			</div>
		</section>
	);
}

function InboundFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-medium text-foreground">
				{value}
			</p>
		</div>
	);
}
