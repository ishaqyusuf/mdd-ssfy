"use client";

import { InventoryVariantsColumnVisibility } from "@/components/tables-2/inventory-variants/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-variants/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type { RouterOutputs } from "@api/trpc/routers/_app";
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type VariantsResponse =
	RouterOutputs["inventories"]["inventoryVariantsWorkspace"];

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

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventoryVariantsWorkspacePage({ initialSettings }: Props) {
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
		() =>
			({
				q: q || null,
				inventoryId: nullableNumber(inventoryId),
				categoryId: nullableNumber(categoryId),
				supplierId: nullableNumber(supplierId),
				status: status === "all" ? null : status,
				stockMode: stockMode === "all" ? null : stockMode,
				lowStock,
				limit: 50,
			}) satisfies RouterInputs["inventories"]["inventoryVariantsWorkspace"],
		[q, inventoryId, categoryId, supplierId, status, stockMode, lowStock],
	);

	const variantsQuery = useQuery(
		trpc.inventories.inventoryVariantsWorkspace.queryOptions(input),
	);
	const rows = variantsQuery.data?.data || [];
	const totalStock = rows.reduce(
		(total, row) => total + Number(row.stockQty || 0),
		0,
	);
	const stockValue = rows.reduce(
		(total, row) => total + Number(row.stockValue || 0),
		0,
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-1">
					<div className="text-sm text-muted-foreground">
						{variantsQuery.isFetching
							? "Refreshing..."
							: `${rows.length} visible variants`}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<InventoryVariantsColumnVisibility />
					<Button asChild variant="outline">
						<Link href="/inventory">Inventory</Link>
					</Button>
				</div>
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

			<DataTable
				data={rows}
				initialSettings={initialSettings}
				isLoading={variantsQuery.isLoading}
			/>
		</div>
	);
}
