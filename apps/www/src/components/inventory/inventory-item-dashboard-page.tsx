"use client";

import { InventoryTopSalesAnalytics } from "@/components/inventory/inventory-top-sales-analytics";
import {
	InventoryItemDashboardColumnVisibility,
	InventoryItemDashboardDataTable,
	type InventoryItemDashboardTableId,
	type InventoryItemRelatedLineRow,
	allocationColumns,
	getAllocationRowId,
	getInboundDemandRowId,
	getMovementRowId,
	getRelatedLineRowId,
	getStockRowId,
	getVariantRowId,
	inboundDemandColumns,
	movementColumns,
	relatedLineColumns,
	stockColumns,
	variantColumns,
} from "@/components/tables-2/inventory-item-dashboard";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import { imageUrl } from "@gnd/utils";
import Link from "next/link";
import type { ReactNode } from "react";

type Dashboard = NonNullable<
	RouterOutputs["inventories"]["inventoryItemDashboard"]
>;

export type InventoryItemDashboardInitialSettings = Partial<
	Record<InventoryItemDashboardTableId, TableSettings>
>;

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

function statusLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function Metric({
	label,
	value,
	subtitle,
}: {
	label: string;
	value: string | number;
	subtitle?: string;
}) {
	return (
		<Card className="p-4">
			<div className="text-xs font-medium uppercase text-muted-foreground">
				{label}
			</div>
			<div className="mt-2 text-2xl font-semibold">{value}</div>
			{subtitle ? (
				<div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
			) : null}
		</Card>
	);
}

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

export function InventoryItemDashboardPage({
	inventoryId,
	initialSettings,
}: {
	inventoryId: number;
	initialSettings?: InventoryItemDashboardInitialSettings;
}) {
	const trpc = useTRPC();
	const dashboardQuery = useQuery(
		trpc.inventories.inventoryItemDashboard.queryOptions({ inventoryId }),
	);
	const dashboard = dashboardQuery.data;

	if (dashboardQuery.isLoading) {
		return (
			<div className="text-sm text-muted-foreground">Loading inventory...</div>
		);
	}

	if (!dashboard) {
		return (
			<Card className="p-6">
				<div className="text-lg font-semibold">Inventory item not found</div>
				<Button asChild className="mt-4" variant="outline">
					<Link href="/inventory">Back to Inventory</Link>
				</Button>
			</Card>
		);
	}

	const { item, summary } = dashboard;
	const imageSrc = item.img?.path
		? imageUrl({
				bucket: item.img.bucket,
				path: item.img.path,
				provider: item.img.provider,
			})
		: null;
	const relatedSales = dashboard.relatedSales.map((row) => ({
		...row,
		kind: "sales" as const,
	})) satisfies InventoryItemRelatedLineRow[];
	const relatedQuotes = dashboard.relatedQuotes.map((row) => ({
		...row,
		kind: "quotes" as const,
	})) satisfies InventoryItemRelatedLineRow[];

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 gap-4">
					<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
						{imageSrc ? (
							<img
								src={imageSrc}
								alt={item.name}
								className="h-full w-full object-cover"
							/>
						) : (
							<span className="text-xs text-muted-foreground">No image</span>
						)}
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="truncate text-2xl font-semibold">{item.name}</h1>
							<Badge variant="outline" className="capitalize">
								{item.productKind}
							</Badge>
							<Badge variant="secondary" className="capitalize">
								{statusLabel(item.status)}
							</Badge>
						</div>
						<div className="mt-1 text-sm text-muted-foreground">
							{item.category?.title || "Uncategorized"} • {item.uid}
						</div>
						<div className="mt-2 flex flex-wrap gap-2">
							<Badge variant="outline" className="capitalize">
								{statusLabel(item.stockMode)}
							</Badge>
							{item.defaultSupplier ? (
								<Badge variant="outline">{item.defaultSupplier.name}</Badge>
							) : null}
							{item.sourceCustom ? (
								<Badge variant="secondary">Custom</Badge>
							) : null}
						</div>
					</div>
				</div>

				<div className="flex gap-2">
					<Button asChild variant="outline">
						<Link href="/inventory">Back</Link>
					</Button>
					<Button asChild>
						<Link href={`/inventory?productId=${item.id}`}>Edit</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric label="Stock" value={formatQty(summary.totalStockQty)} />
				<Metric
					label="Stock Value"
					value={formatMoney(summary.totalStockValue)}
				/>
				<Metric label="Inbound" value={formatQty(summary.openInboundQty)} />
				<Metric
					label="Allocated"
					value={formatQty(summary.activeAllocationQty)}
				/>
				<Metric label="Variants" value={summary.variantCount} />
				<Metric label="Low Stock" value={summary.lowStockVariantCount} />
				<Metric label="Sales" value={summary.salesCount} />
				<Metric label="Quotes" value={summary.quoteCount} />
			</div>

			<Section
				title="Variants"
				action={
					<div className="flex items-center gap-2">
						<InventoryItemDashboardColumnVisibility tableId="inventory-item-variants" />
						<Button asChild size="sm" variant="outline">
							<Link href={`/inventory/variants?inventoryId=${item.id}`}>
								All Variants
							</Link>
						</Button>
					</div>
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-variants"
					data={dashboard.variants}
					columns={variantColumns}
					getRowId={getVariantRowId}
					emptyTitle="No variants"
					emptyDescription="This inventory item does not have variants yet."
					initialSettings={initialSettings?.["inventory-item-variants"]}
					dndId="inventory-item-variants-table-dnd"
				/>
			</Section>

			<Section
				title="Stock"
				action={
					<div className="flex items-center gap-2">
						<InventoryItemDashboardColumnVisibility tableId="inventory-item-stocks" />
						<Button asChild size="sm" variant="outline">
							<Link href="/inventory/stocks">Stock Operations</Link>
						</Button>
					</div>
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-stocks"
					data={dashboard.stocks}
					columns={stockColumns}
					getRowId={getStockRowId}
					emptyTitle="No stock"
					emptyDescription="No stock rows have been recorded for this item."
					initialSettings={initialSettings?.["inventory-item-stocks"]}
					dndId="inventory-item-stocks-table-dnd"
				/>
			</Section>

			<Section
				title="Movement History"
				action={
					<InventoryItemDashboardColumnVisibility tableId="inventory-item-movements" />
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-movements"
					data={dashboard.movements}
					columns={movementColumns}
					getRowId={getMovementRowId}
					emptyTitle="No movements"
					emptyDescription="No stock movement history has been recorded for this item."
					initialSettings={initialSettings?.["inventory-item-movements"]}
					dndId="inventory-item-movements-table-dnd"
				/>
			</Section>

			<Section
				title="Inbound Demand"
				action={
					<div className="flex items-center gap-2">
						<InventoryItemDashboardColumnVisibility tableId="inventory-item-inbound-demands" />
						<Button asChild size="sm" variant="outline">
							<Link href="/inventory/inbounds">Inbound</Link>
						</Button>
					</div>
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-inbound-demands"
					data={dashboard.inboundDemands}
					columns={inboundDemandColumns}
					getRowId={getInboundDemandRowId}
					emptyTitle="No inbound demand"
					emptyDescription="There is no open inbound demand for this item."
					initialSettings={initialSettings?.["inventory-item-inbound-demands"]}
					dndId="inventory-item-inbound-demands-table-dnd"
				/>
			</Section>

			<Section
				title="Allocations"
				action={
					<div className="flex items-center gap-2">
						<InventoryItemDashboardColumnVisibility tableId="inventory-item-allocations" />
						<Button asChild size="sm" variant="outline">
							<Link href="/inventory/allocations">Review</Link>
						</Button>
					</div>
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-allocations"
					data={dashboard.allocations}
					columns={allocationColumns}
					getRowId={getAllocationRowId}
					emptyTitle="No allocations"
					emptyDescription="There are no active allocations for this item."
					initialSettings={initialSettings?.["inventory-item-allocations"]}
					dndId="inventory-item-allocations-table-dnd"
				/>
			</Section>

			<Section
				title="Sales"
				action={
					<InventoryItemDashboardColumnVisibility tableId="inventory-item-related-lines" />
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-related-lines"
					data={relatedSales}
					columns={relatedLineColumns}
					getRowId={getRelatedLineRowId}
					emptyTitle="No sales"
					emptyDescription="No related sales were found for this item."
					initialSettings={initialSettings?.["inventory-item-related-lines"]}
					dndId="inventory-item-sales-lines-table-dnd"
				/>
			</Section>

			<Section
				title="Quotes"
				action={
					<InventoryItemDashboardColumnVisibility tableId="inventory-item-related-lines" />
				}
			>
				<InventoryItemDashboardDataTable
					tableId="inventory-item-related-lines"
					data={relatedQuotes}
					columns={relatedLineColumns}
					getRowId={getRelatedLineRowId}
					emptyTitle="No quotes"
					emptyDescription="No related quotes were found for this item."
					initialSettings={initialSettings?.["inventory-item-related-lines"]}
					dndId="inventory-item-quote-lines-table-dnd"
				/>
			</Section>

			<InventoryTopSalesAnalytics inventoryId={item.id} />
		</div>
	);
}
