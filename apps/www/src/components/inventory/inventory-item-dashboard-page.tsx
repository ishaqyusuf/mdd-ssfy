"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTRPC } from "@/trpc/client";
import { InventoryTopSalesAnalytics } from "@/components/inventory/inventory-top-sales-analytics";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import { imageUrl } from "@gnd/utils";

type Dashboard = NonNullable<
	RouterOutputs["inventories"]["inventoryItemDashboard"]
>;

type Variant = Dashboard["variants"][number];
type StockRow = Dashboard["stocks"][number];
type MovementRow = Dashboard["movements"][number];
type InboundDemandRow = Dashboard["inboundDemands"][number];
type AllocationRow = Dashboard["allocations"][number];
type RelatedLine = Dashboard["relatedSales"][number];

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

function formatDate(value?: string | Date | null) {
	if (!value) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function statusLabel(value?: string | null) {
	return String(value || "unknown").replaceAll("_", " ");
}

function variantLabel(variant?: {
	sku?: string | null;
	description?: string | null;
	uid?: string | null;
}) {
	return variant?.sku || variant?.description || variant?.uid || "Variant";
}

function EmptyState({ label }: { label: string }) {
	return (
		<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
			{label}
		</div>
	);
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

function VariantGrid({ variants }: { variants: Variant[] }) {
	if (!variants.length) return <EmptyState label="No variants found." />;

	return (
		<div className="grid gap-3 lg:grid-cols-2">
			{variants.map((variant) => (
				<Card key={variant.id} className="p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="truncate font-medium">{variantLabel(variant)}</div>
							<div className="mt-1 flex flex-wrap gap-2">
								<Badge variant="outline" className="capitalize">
									{statusLabel(variant.status)}
								</Badge>
								{variant.isLowStock ? (
									<Badge variant="destructive">Low stock</Badge>
								) : null}
							</div>
						</div>
						<div className="text-right text-sm">
							<div className="font-medium">{formatQty(variant.stockQty)}</div>
							<div className="text-muted-foreground">on hand</div>
						</div>
					</div>

					<div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
						<div>
							<div className="text-xs uppercase text-muted-foreground">Cost</div>
							<div>{formatMoney(variant.pricing?.costPrice)}</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">Price</div>
							<div>{formatMoney(variant.pricing?.price)}</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">Value</div>
							<div>{formatMoney(variant.stockValue)}</div>
						</div>
					</div>

					{variant.attributes.length ? (
						<div className="mt-3 flex flex-wrap gap-2">
							{variant.attributes.map((attribute) => (
								<Badge key={attribute.id} variant="secondary">
									{attribute.inventoryCategoryVariantAttribute
										?.valuesInventoryCategory?.title || "Attribute"}
									: {attribute.value?.name || "N/A"}
								</Badge>
							))}
						</div>
					) : null}

					{variant.supplierVariants.length ? (
						<div className="mt-3 border-t pt-3 text-sm">
							{variant.supplierVariants.map((supplierVariant) => (
								<div
									key={supplierVariant.id}
									className="flex items-center justify-between gap-3 py-1"
								>
									<div className="truncate">
										{supplierVariant.supplier.name}
										{supplierVariant.preferred ? " • preferred" : ""}
									</div>
									<div className="text-muted-foreground">
										{formatMoney(supplierVariant.costPrice)}
									</div>
								</div>
							))}
						</div>
					) : null}
				</Card>
			))}
		</div>
	);
}

function StockTable({ rows }: { rows: StockRow[] }) {
	if (!rows.length) return <EmptyState label="No stock rows found." />;

	return (
		<div className="overflow-hidden rounded-md border">
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1.3fr_1fr_1fr_1fr]"
				>
					<div className="min-w-0">
						<div className="truncate font-medium">
							{row.variantSku || row.variantDescription || "Variant"}
						</div>
						<div className="text-muted-foreground">
							{row.location || "No location"}
						</div>
					</div>
					<div>{row.supplier?.name || "No supplier"}</div>
					<div>{formatQty(row.qty)} on hand</div>
					<div className="md:text-right">{formatMoney(row.price)}</div>
				</div>
			))}
		</div>
	);
}

function MovementTable({ rows }: { rows: MovementRow[] }) {
	if (!rows.length) return <EmptyState label="No stock movements found." />;

	return (
		<div className="overflow-hidden rounded-md border">
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_1.2fr]"
				>
					<div>
						<div className="font-medium capitalize">{statusLabel(row.type)}</div>
						<div className="text-muted-foreground">{formatDate(row.createdAt)}</div>
					</div>
					<div>{variantLabel({ sku: row.variantSku })}</div>
					<div>
						{formatQty(row.prevQty)} → {formatQty(row.currentQty)}
					</div>
					<div className="truncate md:text-right">
						{row.reference || row.notes || row.authorName || "N/A"}
					</div>
				</div>
			))}
		</div>
	);
}

function InboundTable({ rows }: { rows: InboundDemandRow[] }) {
	if (!rows.length) return <EmptyState label="No inbound demand found." />;

	return (
		<div className="overflow-hidden rounded-md border">
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_1fr]"
				>
					<div className="min-w-0">
						<div className="truncate font-medium">
							{row.variantSku || "Variant"}
						</div>
						<div className="text-muted-foreground">
							{row.lineItemComponent.parent.sale?.orderId || "No sale"}
						</div>
					</div>
					<div>
						{formatQty(row.qtyReceived)} / {formatQty(row.qty)}
					</div>
					<div className="capitalize">{statusLabel(row.status)}</div>
					<div className="md:text-right">
						{row.inboundShipmentItem?.inbound.reference ||
							row.inboundShipmentItem?.inbound.supplier.name ||
							"Unassigned"}
					</div>
				</div>
			))}
		</div>
	);
}

function AllocationTable({ rows }: { rows: AllocationRow[] }) {
	if (!rows.length) return <EmptyState label="No active allocations found." />;

	return (
		<div className="overflow-hidden rounded-md border">
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_1fr]"
				>
					<div className="min-w-0">
						<div className="truncate font-medium">
							{row.variantSku || "Variant"}
						</div>
						<div className="text-muted-foreground">
							{row.lineItemComponent.parent.title || "Line item"}
						</div>
					</div>
					<div>{row.lineItemComponent.parent.sale?.orderId || "No sale"}</div>
					<div>{formatQty(row.qty)}</div>
					<div className="md:text-right">
						<Badge variant="outline" className="capitalize">
							{statusLabel(row.status)}
						</Badge>
					</div>
				</div>
			))}
		</div>
	);
}

function RelatedLines({
	rows,
	kind,
}: {
	rows: RelatedLine[];
	kind: "sales" | "quotes";
}) {
	if (!rows.length) {
		return <EmptyState label={`No related ${kind} found.`} />;
	}

	return (
		<div className="overflow-hidden rounded-md border">
			{rows.map((row) => {
				const sale = row.sale;
				const href =
					kind === "quotes"
						? `/sales-book/quotes?orderId=${sale?.orderId || ""}`
						: `/sales-book/orders?orderId=${sale?.orderId || ""}`;
				return (
					<div
						key={row.id}
						className="grid gap-3 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
					>
						<div className="min-w-0">
							<div className="truncate font-medium">
								{sale?.orderId || row.uid || "Sales line"}
							</div>
							<div className="text-muted-foreground">
								{sale?.customer?.businessName || sale?.customer?.name || "No customer"}
							</div>
						</div>
						<div>{row.title || "Inventory line"}</div>
						<div>{formatQty(row.qty)}</div>
						<div>{formatMoney(row.totalCost)}</div>
						<Button asChild size="sm" variant="outline">
							<Link href={href}>Open</Link>
						</Button>
					</div>
				);
			})}
		</div>
	);
}

export function InventoryItemDashboardPage({
	inventoryId,
}: {
	inventoryId: number;
}) {
	const trpc = useTRPC();
	const dashboardQuery = useQuery(
		trpc.inventories.inventoryItemDashboard.queryOptions({ inventoryId }),
	);
	const dashboard = dashboardQuery.data;

	if (dashboardQuery.isLoading) {
		return <div className="text-sm text-muted-foreground">Loading inventory...</div>;
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
							{item.sourceCustom ? <Badge variant="secondary">Custom</Badge> : null}
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
				<Metric label="Stock Value" value={formatMoney(summary.totalStockValue)} />
				<Metric label="Inbound" value={formatQty(summary.openInboundQty)} />
				<Metric label="Allocated" value={formatQty(summary.activeAllocationQty)} />
				<Metric label="Variants" value={summary.variantCount} />
				<Metric label="Low Stock" value={summary.lowStockVariantCount} />
				<Metric label="Sales" value={summary.salesCount} />
				<Metric label="Quotes" value={summary.quoteCount} />
			</div>

			<Section
				title="Variants"
				action={
					<Button asChild size="sm" variant="outline">
						<Link href={`/inventory/variants?inventoryId=${item.id}`}>
							All Variants
						</Link>
					</Button>
				}
			>
				<VariantGrid variants={dashboard.variants} />
			</Section>

			<Section
				title="Stock"
				action={
					<Button asChild size="sm" variant="outline">
						<Link href="/inventory/stocks">Stock Operations</Link>
					</Button>
				}
			>
				<StockTable rows={dashboard.stocks} />
			</Section>

			<Section title="Movement History">
				<MovementTable rows={dashboard.movements} />
			</Section>

			<Section
				title="Inbound Demand"
				action={
					<Button asChild size="sm" variant="outline">
						<Link href="/inventory/inbounds">Inbound</Link>
					</Button>
				}
			>
				<InboundTable rows={dashboard.inboundDemands} />
			</Section>

			<Section
				title="Allocations"
				action={
					<Button asChild size="sm" variant="outline">
						<Link href="/inventory/allocations">Review</Link>
					</Button>
				}
			>
				<AllocationTable rows={dashboard.allocations} />
			</Section>

			<Section title="Sales">
				<RelatedLines rows={dashboard.relatedSales} kind="sales" />
			</Section>

			<Section title="Quotes">
				<RelatedLines rows={dashboard.relatedQuotes} kind="quotes" />
			</Section>

			<InventoryTopSalesAnalytics inventoryId={item.id} />
		</div>
	);
}
