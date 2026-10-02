"use client";
import { SalesStockApplicationDialog } from "@/components/forms/new-sales-form/sections/sales-stock-application-dialog";
import { OpenInventoryStockSheet } from "@/components/open-inventory-stock-sheet";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useRef, useState } from "react";
import { SalesStockNeedsTable } from "./sales-stock-needs-table";

export function SalesStockNeedsPanel({
	salesOrderId,
	// Current Needs already owns projection preparation in its parent.
	prepareOnOpen = true,
}: { salesOrderId: number; prepareOnOpen?: boolean }) {
	const trpc = useTRPC();
	const auth = useAuth();
	const client = useQueryClient();
	const prepared = useRef<number | null>(null);
	const [applyOpen, setApplyOpen] = useState(false);
	const [inboundOpen, setInboundOpen] = useState(false);
	const [supplierId, setSupplierId] = useState("none");
	const canManage = Boolean(auth.can.editOrders || auth.can.editInboundOrder);
	const refresh = () =>
		Promise.all([
			client.invalidateQueries({ queryKey: trpc.inventories.pathKey() }),
			client.invalidateQueries({
				queryKey: trpc.sales.getSaleOverview.pathKey(),
			}),
			client.invalidateQueries({ queryKey: trpc.sales.getOrders.pathKey() }),
		]);
	const plan = useQuery(
		trpc.inventories.salesFormStockPlan.queryOptions({ salesOrderId }),
	);
	const preparation = useMutation(
		trpc.inventories.syncSalesInventoryOverview.mutationOptions({
			onSuccess: refresh,
		}),
	);
	useEffect(() => {
		if (
			!prepareOnOpen ||
			!canManage ||
			!plan.data?.canApply ||
			prepared.current === salesOrderId
		)
			return;
		prepared.current = salesOrderId;
		preparation.mutate({ salesOrderId });
	}, [
		prepareOnOpen,
		canManage,
		plan.data?.canApply,
		salesOrderId,
		preparation.mutate,
	]);
	const preparing =
		preparation.isPending ||
		(prepareOnOpen &&
			canManage &&
			plan.data?.canApply &&
			prepared.current !== salesOrderId);
	const shortages =
		plan.data?.rows.filter(
			(row) => row.shortage > 0 && row.inventoryVariantId && !row.mappingIssue,
		) ?? [];
	const suppliers = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined, {
			enabled: inboundOpen,
		}),
	);
	const inbound = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess: async () => {
				await refresh();
				setInboundOpen(false);
				toast({
					title: "Inbound created for uncovered needs",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to create inbound",
					description: error.message,
					variant: "destructive",
				});
				void plan.refetch();
			},
		}),
	);
	const ready = Boolean(
		plan.data?.canApply &&
			!plan.isFetching &&
			!preparing &&
			!preparation.isError,
	);
	return (
		<section
			className="space-y-3"
			aria-label="Warehouse stock for current needs"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="font-medium">Warehouse stock</h3>
					<p className="text-sm text-muted-foreground">
						Reserve available stock, then order the remaining shortage. Inbound
						coverage excludes units already reserved.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<OpenInventoryStockSheet />
					<Button
						variant="outline"
						disabled={
							!ready ||
							!canManage ||
							!plan.data?.rows.some((row) => row.applyQty > 0)
						}
						onClick={() => setApplyOpen(true)}
					>
						Apply available stock
					</Button>
					<Button
						variant="outline"
						disabled={!ready || !auth.can.editInboundOrder || !shortages.length}
						onClick={() => {
							setSupplierId("none");
							setInboundOpen(true);
						}}
					>
						Create shortage inbound
					</Button>
				</div>
			</div>
			{preparation.isError ? (
				<div role="alert">
					<p>{preparation.error.message}</p>
					<Button
						variant="outline"
						onClick={() => preparation.mutate({ salesOrderId })}
					>
						Retry stock check
					</Button>
				</div>
			) : preparing || plan.isPending ? (
				<p>Refreshing inventory needs…</p>
			) : plan.isError ? (
				<div role="alert">
					<p>{plan.error.message}</p>
					<Button variant="outline" onClick={() => plan.refetch()}>
						Retry stock check
					</Button>
				</div>
			) : plan.data.rows.length ? (
				<SalesStockNeedsTable rows={plan.data.rows} />
			) : (
				<p className="text-sm text-muted-foreground">
					No tracked inventory needs selected.
				</p>
			)}
			{plan.data?.blockReason ? (
				<p className="text-sm text-muted-foreground">{plan.data.blockReason}</p>
			) : null}
			{applyOpen ? (
				<SalesStockApplicationDialog
					salesOrderId={salesOrderId}
					open
					initialPlan={plan.data}
					onClose={() => setApplyOpen(false)}
				/>
			) : null}
			<Dialog
				open={inboundOpen}
				onOpenChange={(open) => {
					if (!inbound.isPending) setInboundOpen(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create inbound for shortages</DialogTitle>
						<DialogDescription>
							{shortages.reduce((qty, row) => qty + row.shortage, 0)} pieces
							across {shortages.length} needs. Available warehouse stock and
							existing inbound are excluded.
						</DialogDescription>
					</DialogHeader>
					<Select value={supplierId} onValueChange={setSupplierId}>
						<SelectTrigger aria-label="Inbound supplier">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">No supplier</SelectItem>
							{suppliers.data?.map((supplier) => (
								<SelectItem key={supplier.id} value={String(supplier.id)}>
									{supplier.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button
							variant="outline"
							disabled={inbound.isPending}
							onClick={() => setInboundOpen(false)}
						>
							Cancel
						</Button>
						<Button
							disabled={
								inbound.isPending ||
								!ready ||
								!shortages.length ||
								suppliers.isError ||
								suppliers.isPending
							}
							onClick={() =>
								inbound.mutate({
									supplierId: supplierId === "none" ? null : Number(supplierId),
									operation: "create_inbound",
									componentSelections: shortages.map((row) => ({
										lineItemComponentIds: [row.componentId],
										qty: row.shortage,
									})),
								})
							}
						>
							{inbound.isPending ? "Creating…" : "Create inbound"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
