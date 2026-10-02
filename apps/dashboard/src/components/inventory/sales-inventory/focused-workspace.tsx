"use client";

import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { InventoryItemImage } from "./item-image";
import { useSalesInventoryPanes } from "./pane-context";

type Row = NonNullable<
	RouterOutputs["inventories"]["salesInventoryOverview"]
>["rows"][number];
export function InventoryFocusedWorkspace({
	rows,
	warehouse = false,
	readOnly = false,
	notTracked = false,
}: {
	rows: Row[];
	warehouse?: boolean;
	readOnly?: boolean;
	notTracked?: boolean;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const panes = useSalesInventoryPanes();
	const { inventoryLocation: location, setInventoryLocation: setLocation } =
		useSalesInventorySegmentQuery();
	const ids = [
		...new Set(
			rows.flatMap((row) =>
				row.inventoryVariantId ? [row.inventoryVariantId] : [],
			),
		),
	].sort((a, b) => a - b);
	const query = useQuery(
		trpc.inventories.stockVariantBalances.queryOptions(
			{ inventoryVariantIds: ids },
			{ enabled: ids.length > 0, staleTime: 30_000 },
		),
	);
	const balances = new Map(query.data?.map((balance) => [balance.id, balance]));
	const locations = [
		...new Set(
			query.data?.flatMap((balance) =>
				balance.stocks.map((stock) => stock.location || "Warehouse"),
			),
		),
	].sort();
	if (query.isPending && ids.length)
		return (
			<div className="space-y-3">
				{[0, 1, 2].map((id) => (
					<Skeleton key={id} className="h-20 w-full" />
				))}
			</div>
		);
	if (query.isError)
		return (
			<div role="alert" className="space-y-2 text-sm">
				<p>Unable to check warehouse stock.</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Retry
				</Button>
			</div>
		);
	if (!rows.length)
		return (
			<p className="py-10 text-center text-sm text-muted-foreground">
				{notTracked
					? "Every selected item is tracked."
					: "No tracked inventory needs."}
			</p>
		);
	const visibleRows = warehouse
		? rows.filter(
				(row, index) =>
					rows.findIndex(
						(other) => other.inventoryVariantId === row.inventoryVariantId,
					) === index,
			)
		: rows;
	const filtered = visibleRows.filter(
		(row) =>
			!warehouse ||
			location === "all" ||
			balances
				.get(row.inventoryVariantId ?? 0)
				?.stocks.some((stock) => (stock.location || "Warehouse") === location),
	);
	return (
		<section
			aria-label={warehouse ? "Warehouse stock" : "Inventory needs"}
			className="space-y-4"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					{warehouse
						? "Stock for the items on this order."
						: notTracked
							? "These selections do not require stock."
							: "Select an item to apply stock or order its shortage."}
				</p>
				{warehouse && locations.length > 1 ? (
					<Select
						value={location}
						onValueChange={(value) => value && setLocation(value)}
					>
						<SelectTrigger aria-label="Warehouse location" className="w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All locations</SelectItem>
							{locations.map((value) => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
			</div>
			<div className="divide-y border-y">
				{filtered.map((row) => {
					const balance = balances.get(row.inventoryVariantId ?? 0);
					const buckets =
						balance?.stocks.filter(
							(stock) =>
								location === "all" ||
								(stock.location || "Warehouse") === location,
						) ?? [];
					const available = warehouse
						? buckets.reduce((sum, stock) => sum + stock.availableQty, 0)
						: (balance?.availableQty ?? 0);
					const status = notTracked
						? "Not tracked"
						: row.qtyPending <= 0
							? "Covered"
							: row.qtyInboundLinkedOpen >= row.qtyPending
								? "On the way"
								: available >= row.qtyPending
									? "Available"
									: "Needs stock";
					const content = (
						<>
							<InventoryItemImage
								key="image"
								balance={balance}
								title={row.componentName}
							/>
							<div key="details" className="min-w-0 flex-1 space-y-1">
								<p className="truncate text-sm font-medium">
									{row.componentName}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{[row.stepName, row.variantName].filter(Boolean).join(" · ")}
								</p>
								<p className="text-xs">
									{warehouse ? (
										<>
											On hand{" "}
											<strong>
												{buckets.reduce((sum, stock) => sum + stock.qty, 0)}
											</strong>
											<span className="mx-2 text-muted-foreground">·</span>
											Available <strong>{available}</strong>
										</>
									) : notTracked ? null : (
										<>
											Need <strong>{row.qtyPending}</strong>
											<span className="mx-2 text-muted-foreground">·</span>
											Available <strong>{available}</strong>
										</>
									)}
								</p>
							</div>
						</>
					);
					return warehouse ? (
						<div key={row.id} className="flex items-center gap-4 py-4">
							{content}
							<Button
								variant="outline"
								size="sm"
								disabled={
									readOnly ||
									!auth.can.editInboundOrder ||
									!row.inventoryVariantId ||
									!panes
								}
								data-inventory-pane-trigger={`stock:${row.inventoryVariantId}`}
								onClick={() =>
									row.inventoryVariantId &&
									panes?.openAdjustment({
										inventoryVariantId: row.inventoryVariantId,
										stockId: buckets.length === 1 ? buckets[0]?.id : undefined,
									})
								}
							>
								Adjust
							</Button>
						</div>
					) : (
						<button
							data-inventory-pane-trigger={`need:${row.componentIds.join("-")}`}
							key={row.id}
							type="button"
							disabled={!panes || notTracked}
							onClick={() =>
								panes?.openNeed({
									componentIds: row.componentIds,
									title: row.componentName,
									subtitle: row.variantName,
									inventoryVariantId: row.inventoryVariantId,
								})
							}
							className="flex w-full items-center gap-4 py-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
						>
							<span className="sr-only">View need: </span>
							{content}
							<span className="text-xs text-muted-foreground">{status}</span>
							{!notTracked ? (
								<Icons.ChevronRight className="size-4 shrink-0 text-muted-foreground" />
							) : null}
						</button>
					);
				})}
			</div>
			{!filtered.length ? (
				<div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
					<p>No stock at this location.</p>
					<Button variant="outline" onClick={() => setLocation("all")}>
						Clear location filter
					</Button>
				</div>
			) : null}
		</section>
	);
}
