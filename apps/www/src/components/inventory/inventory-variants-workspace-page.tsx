"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useQuery } from "@gnd/ui/tanstack";

type VariantsResponse =
	RouterOutputs["inventories"]["inventoryVariantsWorkspace"];
type VariantRow = VariantsResponse["data"][number];

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function nullableNumber(value: string) {
	if (!value.trim()) return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

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

function variantTitle(row: VariantRow) {
	return row.sku || row.description || row.uid || `Variant ${row.id}`;
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

function VariantCard({ row }: { row: VariantRow }) {
	return (
		<Card className="p-4">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<div className="truncate text-base font-semibold">{variantTitle(row)}</div>
						<Badge variant="outline" className="capitalize">
							{statusLabel(row.status)}
						</Badge>
						<Badge variant="secondary" className="capitalize">
							{statusLabel(row.stockMode)}
						</Badge>
						{row.isLowStock ? <Badge variant="destructive">Low stock</Badge> : null}
					</div>
					<div className="text-sm text-muted-foreground">
						{row.inventory?.name || "Unknown item"} •{" "}
						{row.category?.title || "Uncategorized"}
					</div>
					{row.attributes.length ? (
						<div className="flex flex-wrap gap-2">
							{row.attributes.map((attribute) => (
								<Badge key={attribute.id} variant="outline">
									{attribute.inventoryCategoryVariantAttribute
										?.valuesInventoryCategory?.title || "Attribute"}
									: {attribute.value?.name || "N/A"}
								</Badge>
							))}
						</div>
					) : null}
				</div>

				<div className="grid gap-3 text-sm sm:grid-cols-4 xl:min-w-[520px]">
					<div>
						<div className="text-xs uppercase text-muted-foreground">Stock</div>
						<div className="font-medium">{formatQty(row.stockQty)}</div>
					</div>
					<div>
						<div className="text-xs uppercase text-muted-foreground">Cost</div>
						<div className="font-medium">{formatMoney(row.costPrice)}</div>
					</div>
					<div>
						<div className="text-xs uppercase text-muted-foreground">Price</div>
						<div className="font-medium">{formatMoney(row.price)}</div>
					</div>
					<div>
						<div className="text-xs uppercase text-muted-foreground">Supplier</div>
						<div className="truncate font-medium">
							{row.preferredSupplier?.supplier?.name ||
								row.inventory?.defaultSupplier?.name ||
								"N/A"}
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
				<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
					<span>{row.supplierCount} suppliers</span>
					<span>{row.stocks.length} stock rows</span>
					{row.lowStockAlert ? <span>Low stock at {row.lowStockAlert}</span> : null}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild size="sm" variant="outline">
						<Link href={`/inventory/${row.inventory?.id}`}>Dashboard</Link>
					</Button>
					<Button asChild size="sm" variant="outline">
						<Link href={`/inventory?productId=${row.inventory?.id}`}>Edit</Link>
					</Button>
					<Button asChild size="sm">
						<Link href="/inventory/stocks">Stock</Link>
					</Button>
				</div>
			</div>
		</Card>
	);
}

export function InventoryVariantsWorkspacePage() {
	const trpc = useTRPC();
	const searchParams = useSearchParams();
	const [q, setQ] = useState("");
	const [inventoryId, setInventoryId] = useState(
		searchParams.get("inventoryId") || "",
	);
	const [categoryId, setCategoryId] = useState("");
	const [supplierId, setSupplierId] = useState("");
	const [status, setStatus] = useState("all");
	const [stockMode, setStockMode] = useState("all");
	const [lowStock, setLowStock] = useState(false);

	const input = useMemo(
		() => ({
			q: q || null,
			inventoryId: nullableNumber(inventoryId),
			categoryId: nullableNumber(categoryId),
			supplierId: nullableNumber(supplierId),
			status: status === "all" ? null : status,
			stockMode: stockMode === "all" ? null : stockMode,
			lowStock,
			limit: 50,
		}),
		[q, inventoryId, categoryId, supplierId, status, stockMode, lowStock],
	);

	const variantsQuery = useQuery(
		trpc.inventories.inventoryVariantsWorkspace.queryOptions(input),
	);
	const rows = variantsQuery.data?.data || [];
	const totalStock = rows.reduce((total, row) => total + Number(row.stockQty || 0), 0);
	const stockValue = rows.reduce(
		(total, row) => total + Number(row.stockValue || 0),
		0,
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold">Inventory Variants</h1>
					<div className="text-sm text-muted-foreground">
						{variantsQuery.isFetching ? "Refreshing..." : `${rows.length} visible variants`}
					</div>
				</div>
				<Button asChild variant="outline">
					<Link href="/inventory">Inventory</Link>
				</Button>
			</div>

			<Card className="p-4">
				<div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
					<Input
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder="Search item, SKU, UID"
					/>
					<Input
						inputMode="numeric"
						value={inventoryId}
						onChange={(event) => setInventoryId(event.target.value)}
						placeholder="Item ID"
					/>
					<Input
						inputMode="numeric"
						value={categoryId}
						onChange={(event) => setCategoryId(event.target.value)}
						placeholder="Category ID"
					/>
					<Input
						inputMode="numeric"
						value={supplierId}
						onChange={(event) => setSupplierId(event.target.value)}
						placeholder="Supplier ID"
					/>
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="published">Published</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="archived">Archived</SelectItem>
						</SelectContent>
					</Select>
					<Select value={stockMode} onValueChange={setStockMode}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Stock</SelectItem>
							<SelectItem value="monitored">Monitored</SelectItem>
							<SelectItem value="unmonitored">Unmonitored</SelectItem>
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant={lowStock ? "default" : "outline"}
						onClick={() => setLowStock((value) => !value)}
					>
						Low Stock
					</Button>
				</div>
			</Card>

			<div className="grid gap-3 md:grid-cols-4">
				<Metric label="Variants" value={rows.length} />
				<Metric label="Stock" value={formatQty(totalStock)} />
				<Metric label="Stock Value" value={formatMoney(stockValue)} />
				<Metric
					label="Low Stock"
					value={rows.filter((row) => row.isLowStock).length}
				/>
			</div>

			<div className="grid gap-3">
				{rows.map((row) => (
					<VariantCard key={row.id} row={row} />
				))}
				{!rows.length ? (
					<Card className="p-6 text-sm text-muted-foreground">
						No variants match the current filters.
					</Card>
				) : null}
			</div>
		</div>
	);
}
