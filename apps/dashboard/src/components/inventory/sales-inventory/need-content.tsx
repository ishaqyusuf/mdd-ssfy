"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { InventoryItemImage } from "./item-image";
import { NeedInboundForm } from "./need-inbound-form";
import { summarizeInventoryNeed } from "./need-summary";
import {
	type InventoryNeedSelection,
	useSalesInventoryPanes,
} from "./pane-context";

export function InventoryNeedContent({
	salesOrderId,
	orderNumber,
	need,
	inbound = false,
	onOrderShortage,
	onBack,
}: {
	salesOrderId: number;
	orderNumber: string;
	need: InventoryNeedSelection;
	inbound?: boolean;
	onOrderShortage: () => void;
	onBack: () => void;
}) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const auth = useAuth();
	const panes = useSalesInventoryPanes();
	const input = { salesOrderId, componentIds: need.componentIds };
	const plan = useQuery(
		trpc.inventories.salesFormStockPlan.queryOptions(input),
	);
	const balances = useQuery(
		trpc.inventories.stockVariantBalances.queryOptions(
			{
				inventoryVariantIds: need.inventoryVariantId
					? [need.inventoryVariantId]
					: [],
			},
			{ enabled: Boolean(need.inventoryVariantId) },
		),
	);
	const balance = balances.data?.[0];
	const refresh = () =>
		Promise.all([
			client.invalidateQueries({ queryKey: trpc.inventories.pathKey() }),
			client.invalidateQueries({
				queryKey: trpc.sales.getSaleOverview.pathKey(),
			}),
			client.invalidateQueries({ queryKey: trpc.sales.getOrders.pathKey() }),
		]);
	const mutation = useMutation(
		trpc.inventories.applySalesFormStock.mutationOptions({
			onSuccess: async (result) => {
				await refresh();
				toast({
					title: "Stock applied",
					description: `${result.appliedQty} pieces applied to this need.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to apply stock",
					description: error.message,
					variant: "destructive",
				});
				void plan.refetch();
			},
		}),
	);
	const summary = summarizeInventoryNeed(plan.data?.rows ?? []);
	const canApply = Boolean(
		plan.data?.canApply && (auth.can.editOrders || auth.can.editInboundOrder),
	);
	const ready = Boolean(
		plan.data &&
			!plan.isFetching &&
			!plan.isError &&
			!mutation.isPending &&
			!plan.data.rows.some((row) => row.mappingIssue),
	);
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<InventoryItemImage balance={balance} title={need.title} />
				<div className="min-w-0">
					<h3 className="text-sm font-medium">{need.title}</h3>
					<p className="text-xs text-muted-foreground">{need.subtitle}</p>
				</div>
			</div>
			{plan.isPending ? (
				<Skeleton className="h-28 w-full" />
			) : plan.isError ? (
				<div role="alert" className="space-y-2">
					<p className="text-sm">{plan.error.message}</p>
					<Button variant="outline" onClick={() => plan.refetch()}>
						Retry
					</Button>
				</div>
			) : inbound && plan.data ? (
				<NeedInboundForm
					key={need.componentIds.join("-")}
					plan={plan.data}
					orderNumber={orderNumber}
					refreshPlan={async () =>
						(await plan.refetch({ throwOnError: true })).data
					}
					onCreated={async () => {
						await refresh();
						onBack();
					}}
				/>
			) : (
				<>
					<dl className="grid grid-cols-3 border-y py-4 text-sm">
						{[
							["Required", summary.required],
							["Applied", summary.applied],
							["Still needed", summary.remaining],
						].map(([label, qty]) => (
							<div key={label}>
								<dt className="text-xs text-muted-foreground">{label}</dt>
								<dd className="mt-1 text-xl font-medium tabular-nums">{qty}</dd>
							</div>
						))}
					</dl>
					{summary.onWay > 0 ? (
						<p className="text-sm text-muted-foreground">
							{summary.onWay} pieces on the way.
						</p>
					) : null}
					{plan.data?.rows[0] && plan.data.rows[0].piecesPerUnit > 1 ? (
						<p className="text-xs text-muted-foreground">
							{plan.data.rows[0].piecesPerUnit} pieces per selected unit.
						</p>
					) : null}
					<section className="space-y-3">
						<h4 className="text-sm font-medium">Warehouse stock</h4>
						{balances.isError ? (
							<div role="alert">
								<p className="text-sm">Unable to load warehouse stock.</p>
								<Button variant="outline" onClick={() => balances.refetch()}>
									Retry
								</Button>
							</div>
						) : balances.isPending && need.inventoryVariantId ? (
							<Skeleton className="h-16 w-full" />
						) : balance?.stocks.length ? (
							<div className="divide-y">
								{balance.stocks.map((stock) => (
									<div key={stock.id} className="space-y-2 py-3">
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-sm">
													{stock.location || "Warehouse"}
												</p>
												<p className="text-xs text-muted-foreground">
													{stock.supplier?.name || "No supplier"}
												</p>
											</div>
											{auth.can.editInboundOrder ? (
												<Button
													variant="outline"
													size="sm"
													disabled={!canApply || mutation.isPending}
													onClick={() =>
														need.inventoryVariantId &&
														panes?.openAdjustment({
															inventoryVariantId: need.inventoryVariantId,
															stockId: stock.id,
															returnNeed: need,
														})
													}
												>
													Adjust stock
												</Button>
											) : null}
										</div>
										<p className="text-xs text-muted-foreground">
											On hand {stock.qty}
											<span className="mx-2">·</span>Reserved{" "}
											{stock.reservedQty}
											<span className="mx-2">·</span>
											<span className="text-foreground">
												Available {stock.availableQty}
											</span>
										</p>
									</div>
								))}
							</div>
						) : (
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm text-muted-foreground">
									No warehouse stock.
								</p>
								{auth.can.editInboundOrder && need.inventoryVariantId ? (
									<Button
										variant="outline"
										size="sm"
										disabled={!canApply}
										onClick={() =>
											need.inventoryVariantId &&
											panes?.openAdjustment({
												inventoryVariantId: need.inventoryVariantId,
												returnNeed: need,
											})
										}
									>
										Adjust stock
									</Button>
								) : null}
							</div>
						)}
					</section>
					{plan.data?.blockReason ? (
						<p className="text-sm text-muted-foreground">
							{plan.data.blockReason}
						</p>
					) : null}
					{plan.data?.rows.some((row) => row.mappingIssue) ? (
						<p role="alert" className="text-sm">
							This selection needs a catalog review before stock can be applied.
						</p>
					) : null}
					<div className="space-y-3 border-t pt-4">
						{summary.apply > 0 ? (
							<>
								<p className="text-sm text-muted-foreground">
									Apply {summary.apply} available pieces.{" "}
									{summary.shortage > 0
										? `${summary.shortage} pieces will still need ordering.`
										: "This covers the remaining need."}
								</p>
								<Button
									className="w-full"
									disabled={!canApply || !ready}
									onClick={() =>
										plan.data &&
										mutation.mutate({
											...input,
											expectedRevision: plan.data.revision,
										})
									}
								>
									{mutation.isPending
										? "Applying…"
										: `Apply available · ${summary.apply} pieces`}
								</Button>
							</>
						) : summary.shortage > 0 ? (
							<Button
								className="w-full"
								disabled={!canApply || !ready || !auth.can.editInboundOrder}
								onClick={onOrderShortage}
							>
								Order shortage · {summary.shortage} pieces
							</Button>
						) : (
							<p className="text-sm text-muted-foreground">
								{summary.remaining <= 0
									? "This need is covered."
									: "The remaining pieces are already on the way."}
							</p>
						)}
					</div>
				</>
			)}
		</div>
	);
}
