"use client";
import { useTRPC } from "@/trpc/client";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import { AvailabilityActionGroup } from "./availability-action-group";
import { CoveredMaterialsAction } from "./covered-materials-action";

export function ProductionMaterialAvailability({
	salesOrderId,
	onOpenForm,
	onOpenInventory,
}: {
	salesOrderId: number;
	onOpenForm?: () => void;
	onOpenInventory?: () => void;
}) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.sales.productionAvailability.queryOptions({ salesOrderId }),
	);
	const { setParams } = useSalesOverviewQuery();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const openInventory = () => {
		if (onOpenInventory) return onOpenInventory();
		setInventorySegment("stock");
		setParams({ salesTab: "inventory" });
	};
	if (query.isLoading)
		return (
			<p className="text-sm text-muted-foreground" role="status">
				Checking material availability…
			</p>
		);
	if (query.isError)
		return (
			<Button variant="outline" onClick={() => query.refetch()}>
				Retry material availability
			</Button>
		);
	const summary = query.data;
	if (!summary || ["readonly"].includes(summary.state)) return null;
	if (["review", "covered", "pending_inbound"].includes(summary.state))
		return (
			<CoveredMaterialsAction
				salesOrderId={salesOrderId}
				showPending={summary.state === "review"}
				onOpenInventory={openInventory}
			/>
		);
	const message =
		summary.state === "missing_inbound"
			? "No inbound has been created for this order."
			: summary.state === "remaining_needs"
				? "Some materials still need availability confirmation."
				: "Material availability has not been confirmed yet.";
	return (
		<>
			<section
				aria-label="Material availability"
				className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3"
			>
				<div className="space-y-1">
					<h3 className="text-sm font-medium">{message}</h3>
					{summary.itemCount > 0 && (
						<p className="text-xs text-muted-foreground">
							{summary.itemCount} material{" "}
							{summary.itemCount === 1 ? "item" : "items"} ·{" "}
							{summary.pendingQty} units pending
							{summary.workerMode ? " for your assignments" : ""}.
						</p>
					)}
					{summary.workerMode && !summary.canMarkAvailable && (
						<p className="text-xs text-muted-foreground">
							Contact your supervisor to confirm these materials.
						</p>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{!summary.workerMode && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								if (onOpenInventory) {
									onOpenInventory();
									return;
								}
								setInventorySegment("stock");
								setParams({ salesTab: "inventory" });
							}}
						>
							Open inventory
						</Button>
					)}
					{summary.canMarkAvailable && onOpenForm && (
						<AvailabilityActionGroup
							salesOrderId={salesOrderId}
							onOpenForm={onOpenForm}
						/>
					)}
				</div>
			</section>
			<CoveredMaterialsAction salesOrderId={salesOrderId} onOpenInventory={openInventory} />
		</>
	);
}
