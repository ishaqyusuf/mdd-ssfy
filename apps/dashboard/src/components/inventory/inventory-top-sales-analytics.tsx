"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import { useMemo } from "react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";

type Analytics = RouterOutputs["inventories"]["inventoryTopSalesAnalytics"];
type AnalyticsRow = Analytics["topItemsByOrderedQty"][number];

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function formatMoney(value?: number | null) {
	return currency.format(Number(value || 0));
}

function formatQty(value?: number | null) {
	return Number(value || 0).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});
}

function rowTitle(row: AnalyticsRow, mode: "item" | "variant") {
	if (mode === "variant") {
		return row.variantSku || row.variantDescription || row.variantUid || "Variant";
	}
	return row.inventoryName || row.inventoryUid || "Inventory item";
}

function Metric({ label, value }: { label: string; value: string | number }) {
	return (
		<Card className="p-4">
			<div className="text-xs font-medium uppercase text-muted-foreground">
				{label}
			</div>
			<div className="mt-2 text-2xl font-semibold">{value}</div>
		</Card>
	);
}

function RankingList({
	title,
	rows,
	metric,
	mode,
}: {
	title: string;
	rows: AnalyticsRow[];
	metric: "orderedQty" | "shippedQty" | "revenue";
	mode: "item" | "variant";
}) {
	return (
		<Card className="p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h3 className="text-sm font-semibold">{title}</h3>
				<Badge variant="outline">
					{metric === "revenue" ? "Revenue" : metric === "orderedQty" ? "Ordered" : "Shipped"}
				</Badge>
			</div>
			<div className="divide-y">
				{rows.length ? null : (
					<div className="py-6 text-center text-sm text-muted-foreground">
						No rows found.
					</div>
				)}
				{rows.map((row) => (
					<div key={row.key} className="flex items-center justify-between gap-3 py-3">
						<div className="min-w-0">
							<div className="truncate text-sm font-medium">{rowTitle(row, mode)}</div>
							<div className="truncate text-xs text-muted-foreground">
								{mode === "variant" ? row.inventoryName || "No item" : row.categoryName || "No category"}
							</div>
						</div>
						<div className="shrink-0 text-right text-sm">
							<div className="font-medium">
								{metric === "revenue"
									? formatMoney(row.revenue)
									: formatQty(row[metric])}
							</div>
							<div className="text-xs text-muted-foreground">
								{row.saleCount} sales
							</div>
						</div>
					</div>
				))}
			</div>
		</Card>
	);
}

export function InventoryTopSalesAnalytics({
	inventoryId,
}: {
	inventoryId?: number;
}) {
	const trpc = useTRPC();
	const input = useMemo(
		() => ({
			inventoryId: inventoryId || null,
			limit: 5,
		}),
		[inventoryId],
	);
	const analyticsQuery = useQuery(
		trpc.inventories.inventoryTopSalesAnalytics.queryOptions(input),
	);
	const analytics = analyticsQuery.data;

	if (analyticsQuery.isLoading) {
		return (
			<Card className="p-4 text-sm text-muted-foreground">
				Loading top sales...
			</Card>
		);
	}

	if (!analytics) {
		return (
			<Card className="p-4 text-sm text-muted-foreground">
				No inventory sales analytics found.
			</Card>
		);
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h2 className="text-lg font-semibold">Top Sales Analytics</h2>
					<div className="mt-1 flex flex-wrap gap-2">
						<Badge variant="outline">Inventory-backed</Badge>
						<Badge variant="secondary">90 days</Badge>
						<Badge variant="outline">Consumed allocations</Badge>
					</div>
				</div>
				{inventoryId ? (
					<Button asChild variant="outline" size="sm">
						<Link href="/inventory/variants">All Variants</Link>
					</Button>
				) : null}
			</div>

			<div className="grid gap-3 md:grid-cols-4">
				<Metric label="Ordered" value={formatQty(analytics.summary.orderedQty)} />
				<Metric label="Shipped" value={formatQty(analytics.summary.shippedQty)} />
				<Metric label="Revenue" value={formatMoney(analytics.summary.revenue)} />
				<Metric label="Margin" value={formatMoney(analytics.summary.grossMargin)} />
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<RankingList
					title="Items By Ordered Qty"
					rows={analytics.topItemsByOrderedQty}
					metric="orderedQty"
					mode="item"
				/>
				<RankingList
					title="Items By Shipped Qty"
					rows={analytics.topItemsByShippedQty}
					metric="shippedQty"
					mode="item"
				/>
				<RankingList
					title="Variants By Ordered Qty"
					rows={analytics.topVariantsByOrderedQty}
					metric="orderedQty"
					mode="variant"
				/>
				<RankingList
					title="Variants By Shipped Qty"
					rows={analytics.topVariantsByShippedQty}
					metric="shippedQty"
					mode="variant"
				/>
			</div>

			<div className="text-xs text-muted-foreground">
				Revenue lines: {analytics.summary.revenueReliableLineCount} /{" "}
				{analytics.summary.inventoryBackedLineCount}; cost lines:{" "}
				{analytics.summary.costReliableLineCount} /{" "}
				{analytics.summary.inventoryBackedLineCount}.
			</div>
		</section>
	);
}
