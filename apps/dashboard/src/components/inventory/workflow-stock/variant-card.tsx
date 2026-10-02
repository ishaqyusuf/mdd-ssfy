"use client";

import { OpenInventoryStockSheet } from "@/components/open-inventory-stock-sheet";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { WorkflowStockStatusIcon } from "./stock-status";

type StockVariant =
	RouterOutputs["inventories"]["workflowStock"]["components"][number]["variants"][number];
const number = (value: number) =>
	value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function WorkflowStockVariantCard({
	variant,
	expanded,
	unit,
}: { variant: StockVariant; expanded: boolean; unit: string }) {
	return (
		<AccordionItem
			value={String(variant.id)}
			className="mb-2 overflow-hidden rounded-lg border"
		>
			<AccordionTrigger className="gap-2 px-3 py-3 text-left hover:no-underline">
				<span className="min-w-0 flex-1">
					<span className="block break-words text-xs font-semibold">
						{variant.label}
					</span>
					<span className="mt-1 block break-all text-[10px] font-normal text-muted-foreground">
						{variant.uid} · {unit}
					</span>
				</span>
				<span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-normal">
					<WorkflowStockStatusIcon
						status={variant.alertsEnabled ? variant.level : "alerts_off"}
					/>
					{number(variant.available)} available
				</span>
			</AccordionTrigger>
			<AccordionContent className="px-3 pb-3">
				{expanded ? (
					<WorkflowStockVariantDetails variant={variant} unit={unit} />
				) : null}
			</AccordionContent>
		</AccordionItem>
	);
}

function WorkflowStockVariantDetails({
	variant,
	unit,
}: { variant: StockVariant; unit: string }) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const canManage = Boolean(
		auth.can.editInboundOrder || auth.can.editSalesComponent,
	);
	const switchId = `workflow-stock-alert-${variant.id}`;
	const balances = useQuery(
		trpc.inventories.stockVariantBalances.queryOptions(
			{ inventoryVariantIds: [variant.id] },
			{ staleTime: 15_000 },
		),
	);
	const alerts = useMutation(
		trpc.inventories.setVariantStockAlerts.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.workflowStock.pathKey(),
				});
				requestAnimationFrame(() => document.getElementById(switchId)?.focus());
			},
			onError: (error) =>
				toast({
					title: "Unable to update stock alerts",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<>
			<dl className="grid grid-cols-3 gap-2 border-t pt-3">
				{[
					["Available", variant.available],
					["Physical", variant.physical],
					["Committed", variant.committed],
				].map(([label, value]) => (
					<div key={label}>
						<dt className="text-[10px] text-muted-foreground">{label}</dt>
						<dd className="mt-1 text-xl font-semibold tabular-nums">
							{number(Number(value))}
						</dd>
					</div>
				))}
			</dl>
			<p className="mt-2 text-[10px] text-muted-foreground">
				{number(variant.pendingReview)} awaiting review · does not reduce
				available
			</p>
			<div className="mt-3 flex items-center justify-between gap-3 border-y py-3">
				<label htmlFor={switchId} className="min-w-0">
					<span className="block text-xs font-medium">Stock alerts</span>
					<span className="mt-1 block text-[10px] text-muted-foreground">
						{variant.alertsEnabled
							? `Warn at ${number(variant.threshold)} ${unit} or fewer.`
							: "Off for this variant. Stock stays tracked."}
					</span>
				</label>
				<Switch
					id={switchId}
					aria-label={`Stock alerts for ${variant.label}`}
					checked={variant.alertsEnabled}
					disabled={!canManage || alerts.isPending}
					onCheckedChange={(enabled) =>
						alerts.mutate({ inventoryVariantId: variant.id, enabled })
					}
				/>
			</div>
			<p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
				Warehouse stock · {unit}
			</p>
			{balances.isPending ? (
				<p className="py-3 text-xs text-muted-foreground">
					Loading warehouse stock…
				</p>
			) : balances.isError ? (
				<div className="py-3">
					<p role="alert" className="text-xs text-muted-foreground">
						Warehouse stock unavailable.
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => void balances.refetch()}
					>
						Retry
					</Button>
				</div>
			) : !balances.data?.[0]?.stocks.length ? (
				<p className="py-3 text-xs text-muted-foreground">
					No stock locations recorded.
				</p>
			) : (
				balances.data[0].stocks.map((stock) => (
					<div
						key={stock.id}
						data-workflow-stock-adjust-target={`stock-${stock.id}`}
						className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-xs"
					>
						<div className="min-w-0">
							<p className="break-words font-medium">
								{stock.location || "Unspecified location"}
							</p>
							{stock.supplier ? (
								<p className="text-[10px] text-muted-foreground">
									{stock.supplier.name}
								</p>
							) : null}
							<p className="mt-1 text-[10px] text-muted-foreground">
								{number(stock.qty)} physical · {number(stock.availableQty)}{" "}
								available
							</p>
						</div>
						{auth.can.editInboundOrder ? (
							<OpenInventoryStockSheet
								inventoryVariantId={variant.id}
								inventoryStockId={stock.id}
								size="sm"
								variant="ghost"
							/>
						) : null}
					</div>
				))
			)}
			{auth.can.editInboundOrder ? (
				<div
					className="mt-3 [&_button]:w-full"
					data-workflow-stock-adjust-target={`variant-${variant.id}`}
				>
					<OpenInventoryStockSheet inventoryVariantId={variant.id} size="sm" />
				</div>
			) : null}
		</>
	);
}
