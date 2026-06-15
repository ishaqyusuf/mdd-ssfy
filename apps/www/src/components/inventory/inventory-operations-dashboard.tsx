"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";

type OperationsSummary =
	RouterOutputs["inventories"]["inventoryOperationsSummary"];
type AlertRow = OperationsSummary["alerts"][number];

function formatNumber(value?: number | null) {
	return Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});
}

function MetricCard({
	label,
	value,
	href,
	accent,
}: {
	label: string;
	value: string | number;
	href?: string;
	accent?: "default" | "warning" | "danger";
}) {
	const content = (
		<Card
			className={
				accent === "danger"
					? "p-4 border-red-200 bg-red-50"
					: accent === "warning"
						? "p-4 border-amber-200 bg-amber-50"
						: "p-4"
			}
		>
			<div className="text-xs font-medium uppercase text-muted-foreground">
				{label}
			</div>
			<div className="mt-2 text-2xl font-semibold">{value}</div>
		</Card>
	);

	if (!href) {
		return content;
	}

	return (
		<Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-ring">
			{content}
		</Link>
	);
}

function OperationsDashboardSkeleton() {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<div className="space-y-2">
					<Skeleton className="h-5 w-56" />
					<Skeleton className="h-4 w-80" />
				</div>
				<Skeleton className="h-9 w-28" />
			</div>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 8 }).map((_, index) => (
					<Card key={`inventory-operations-skeleton-${index}`} className="p-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="mt-3 h-7 w-16" />
					</Card>
				))}
			</div>
		</section>
	);
}

function AlertRow({ row }: { row: AlertRow }) {
	return (
		<div className="flex flex-col gap-3 border-b py-3 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<div className="truncate text-sm font-medium">
						{row.inventoryName}
					</div>
					{row.isOutOfStock ? (
						<Badge variant="destructive">Out</Badge>
					) : (
						<Badge variant="secondary">Low</Badge>
					)}
					<Badge variant="outline" className="capitalize">
						{row.stockMode}
					</Badge>
				</div>
				<div className="mt-1 truncate text-xs text-muted-foreground">
					{row.variantSku || row.variantDescription || row.variantUid || "Variant"} ·{" "}
					{row.categoryName || "No category"}
				</div>
				<div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
					<span>{formatNumber(row.stockQty)} on hand</span>
					{row.lowStockAlert != null ? (
						<span>Threshold {formatNumber(row.lowStockAlert)}</span>
					) : null}
					{row.supplierName ? <span>{row.supplierName}</span> : null}
					{row.leadTimeDays != null ? (
						<span>{formatNumber(row.leadTimeDays)} day lead</span>
					) : null}
				</div>
			</div>
			<div className="flex shrink-0 flex-wrap gap-2">
				{row.inventoryId ? (
					<Button asChild variant="outline" size="sm">
						<Link href={`/inventory/${row.inventoryId}`}>Item</Link>
					</Button>
				) : null}
				{row.inventoryId ? (
					<Button asChild variant="outline" size="sm">
						<Link href={`/inventory/variants?inventoryId=${row.inventoryId}`}>
							Variants
						</Link>
					</Button>
				) : null}
				<Button asChild variant="outline" size="sm">
					<Link href="/inventory/stocks">Stock</Link>
				</Button>
			</div>
		</div>
	);
}

export function InventoryOperationsDashboard() {
	const trpc = useTRPC();
	const operationsQuery = useQuery(
		trpc.inventories.inventoryOperationsSummary.queryOptions(undefined),
	);
	const data = operationsQuery.data;

	if (operationsQuery.isLoading) {
		return <OperationsDashboardSkeleton />;
	}

	if (!data) {
		return (
			<Card className="p-4 text-sm text-muted-foreground">
				Inventory operations summary unavailable.
			</Card>
		);
	}

	const summary = data.summary;

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h2 className="text-lg font-semibold">Operations Dashboard</h2>
					<div className="mt-1 flex flex-wrap gap-2">
						<Badge variant="outline">Item tracking</Badge>
						<Badge variant="secondary">
							{data.trackingPolicy.thresholdField}
						</Badge>
						<Badge variant="outline">
							{data.trackingPolicy.variantOverride ? "Variant override" : "Category mode"}
						</Badge>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/categories">Categories</Link>
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/variants">Variants</Link>
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/stocks">Stock Ops</Link>
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/dispatch-mode">Dispatch</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Tracked Variants"
					value={formatNumber(summary.trackedVariants)}
					href="/inventory/variants"
				/>
				<MetricCard
					label="Untracked Variants"
					value={formatNumber(summary.untrackedVariants)}
					href="/inventory/variants"
				/>
				<MetricCard
					label="Low Stock"
					value={formatNumber(summary.lowStockVariants)}
					href="/inventory/variants"
					accent={summary.lowStockVariants ? "warning" : "default"}
				/>
				<MetricCard
					label="Out Of Stock"
					value={formatNumber(summary.outOfStockVariants)}
					href="/inventory/stocks"
					accent={summary.outOfStockVariants ? "danger" : "default"}
				/>
				<MetricCard
					label="Open Inbound"
					value={formatNumber(summary.openInboundQty)}
					href="/inventory/inbounds"
				/>
				<MetricCard
					label="Pending Allocation"
					value={formatNumber(summary.pendingAllocationQty)}
					href="/inventory/allocations"
				/>
				<MetricCard
					label="Backordered Lines"
					value={formatNumber(summary.backorderedLineCount)}
					href="/inventory/backorders"
					accent={summary.backorderedLineCount ? "warning" : "default"}
				/>
				<MetricCard
					label="Production Blockers"
					value={formatNumber(summary.productionBlockerCount)}
					href="/inventory/production-plan"
					accent={summary.productionBlockerCount ? "warning" : "default"}
				/>
			</div>

			<Card className="p-4">
				<div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h3 className="text-sm font-semibold">Stock Alerts</h3>
						<div className="text-xs text-muted-foreground">
							{formatNumber(summary.trackedItems)} tracked items ·{" "}
							{formatNumber(summary.untrackedItems)} untracked items
						</div>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/inbounds">Inbound</Link>
					</Button>
				</div>
				<div>
					{data.alerts.length ? null : (
						<div className="py-6 text-center text-sm text-muted-foreground">
							No stock alerts.
						</div>
					)}
					{data.alerts.map((row) => (
						<AlertRow key={row.inventoryVariantId} row={row} />
					))}
				</div>
			</Card>
		</section>
	);
}
