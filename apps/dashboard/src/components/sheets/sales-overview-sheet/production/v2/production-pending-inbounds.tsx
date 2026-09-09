"use client";

import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import { toast } from "@gnd/ui/use-toast";
import { useRef, useState } from "react";

export function ProductionPendingInbounds({
	salesOrderId,
	inventoryMode = false,
	onOpenInventory,
}: { salesOrderId: number; inventoryMode?: boolean; onOpenInventory?: (inboundId?: number) => void }) {
	const { selectedInventoryInboundId } = useSalesInventorySegmentQuery();
	return <ProductionInboundPanel
		key={`${salesOrderId}:${inventoryMode ? `inbound:${selectedInventoryInboundId ?? "all"}` : "production"}`}
		salesOrderId={salesOrderId}
		inventoryMode={inventoryMode}
		onOpenInventory={onOpenInventory}
	/>;
}

function ProductionInboundPanel({
	salesOrderId,
	inventoryMode,
	onOpenInventory,
}: { salesOrderId: number; inventoryMode: boolean; onOpenInventory?: (inboundId?: number) => void }) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const { setParams } = useSalesOverviewQuery();
	const { setInventorySegment, selectedInventoryInboundId } =
		useSalesInventorySegmentQuery();
	const [cursor, setCursor] = useState<number | undefined>();
	const [receiptCursor, setReceiptCursor] = useState<number | undefined>();
	const requests = useRef(new Map<string, string>());
	const query = useQuery(
		trpc.sales.productionPendingInbounds.queryOptions({
			salesOrderId,
			inboundId: inventoryMode
				? (selectedInventoryInboundId ?? undefined)
				: undefined,
			cursor,
			receiptCursor,
			take: 10,
		}),
	);
	const workerMode = query.data?.workerMode ?? false;
	const [received, setReceived] = useState(false);
	const cancel = useMutation(trpc.sales.cancelProductionInbound.mutationOptions({
		onSuccess: async () => {
			setReceiptCursor(undefined);
			setCursor(undefined);
			await client.invalidateQueries({ queryKey: trpc.sales.productionPendingInbounds.queryKey() });
			toast({ title: "Receipt cancelled", description: "Materials and Production have been updated.", variant: "success" });
		},
		onError: async error => {
			toast({ title: "Unable to cancel receipt", description: error.message, variant: "destructive" });
			await query.refetch();
		},
	}));
	const receive = useMutation(
		trpc.sales.receiveProductionInbound.mutationOptions({
			onSuccess: async (result) => {
				setReceived(true);
				await client.invalidateQueries({
					queryKey: trpc.sales.productionPendingInbounds.queryKey(),
				});
				setCursor(undefined);
				setReceiptCursor(undefined);
				toast({
					title: workerMode
						? "Materials received"
						: "Inbound materials received and applied to needs",
					description:
						result.needsSupervisor
							? workerMode
								? "Contact your supervisor. Some production details still need checking."
								: "Some material or review conditions remain unresolved. See Inventory and Production for details."
							: undefined,
					variant: "success",
				});
			},
			onError: async (error) => {
				toast({
					title: "Unable to receive inbound",
					description: workerMode
						? "Contact your supervisor. We could not confirm these materials."
						: error.message,
					variant: "destructive",
				});
				await query.refetch();
			},
		}),
	);
	if (query.isLoading)
		return (
			<p className="text-sm text-muted-foreground">Loading pending inbounds…</p>
		);
	if (query.isError)
		return (
			<Button variant="outline" onClick={() => query.refetch()}>
				Retry pending inbounds
			</Button>
		);
	if (!query.data?.count && !query.data?.receipts.length)
		return workerMode && (received || query.data?.needsSupervisor) ? (
			<p className="text-sm" role="status">
				{query.data?.needsSupervisor
					? "Contact your supervisor. Some production details still need checking."
					: "Materials received."}
			</p>
		) : inventoryMode ? (
			<p className="text-sm text-muted-foreground">
				No pending receipt is available for this inbound.
			</p>
		) : null;
	return (
		<section className="space-y-3" aria-label="Materials need verification">
			{!workerMode && cancel.error && (
				<p role="alert" className="text-sm text-destructive">
					Unable to cancel receipt. {cancel.error.message}
				</p>
			)}
			{query.data.count > 0 && <div>
				<h3 className="text-sm font-medium">
					{workerMode ? "Materials" : "Materials need verification"}
				</h3>
				<p className="text-xs text-muted-foreground">
					{query.data.count} pending inbound{query.data.count === 1 ? "" : "s"}
				</p>
			</div>}
			{!workerMode && query.data.receipts.map((receipt) => (
				<div key={receipt.receiptId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
					<p>Inbound #{receipt.inboundId} {receipt.cancelled ? "receipt cancelled." : "marked as received."}</p>
					<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={() => {
						if (onOpenInventory) { onOpenInventory(receipt.inboundId); return; }
						setInventorySegment("inbounds", { inboundId: receipt.inboundId });
						setParams({ salesTab: "inventory" });
					}}>Open inbound</Button>
					{receipt.canCancel ? <Button size="sm" disabled={cancel.isPending || receive.isPending} onClick={() => {
						const identity = `cancel:${receipt.receiptId}`;
						const key = requests.current.get(identity) ?? crypto.randomUUID();
						requests.current.set(identity, key);
						cancel.mutate({ salesOrderId, receiptId: receipt.receiptId, idempotencyKey: key });
					}}>{cancel.isPending && cancel.variables && cancel.variables.receiptId === receipt.receiptId ? "Cancelling…" : "Cancel review"}</Button> : null}
					</div>
					{!receipt.cancelled && receipt.cancellationUnavailableReason ? <p className="w-full text-xs text-muted-foreground">{receipt.cancellationUnavailableReason}</p> : null}
				</div>
			))}
			{!workerMode && (receiptCursor || query.data.nextReceiptCursor) ? (
				<div className="flex gap-2">
					{receiptCursor ? <Button size="sm" variant="ghost" onClick={() => setReceiptCursor(undefined)}>Latest receipts</Button> : null}
					{query.data.nextReceiptCursor ? <Button size="sm" variant="ghost" onClick={() => setReceiptCursor(query.data.nextReceiptCursor ?? undefined)}>Older receipts</Button> : null}
				</div>
			) : null}
			<div className="divide-y">
				{query.data.rows.map((inbound) => (
					<div
						key={inbound.id}
						className="flex flex-wrap items-center justify-between gap-2 py-2"
					>
						<div className="min-w-0">
							<p className="text-sm font-medium">
								{inbound.reference || `Inbound #${inbound.id}`}
							</p>
							<p className="text-xs text-muted-foreground">
								{inbound.supplier}
							</p>
							{workerMode ? (
								<p className="text-xs text-muted-foreground">
									Expected:{" "}
									{inbound.expectedAt
										? formatDate(inbound.expectedAt)
										: "Not scheduled"}{" "}
									· Quantity: {inbound.totalQty}
								</p>
							) : null}
							{workerMode ? (
								<p className="mt-1 text-sm">
									{!query.data.receivingEnabled
										? "Waiting for material confirmation"
										: inbound.canReceive
											? "Have these materials arrived?"
											: "Contact your supervisor. These materials need checking."}
								</p>
							) : null}
							{inventoryMode && (
								<ul className="mt-2 text-sm">
									{inbound.items.map((item) => (
										<li key={item.id}>
											{item.name} · {item.remaining} pending
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="flex gap-2">
							{!workerMode && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										if (onOpenInventory) { onOpenInventory(inbound.id); return; }
										if (inventoryMode) setParams({ salesTab: "production" });
										else {
											setInventorySegment("inbounds", {
												inboundId: inbound.id,
											});
											setParams({ salesTab: "inventory" });
										}
									}}
								>
									{inventoryMode ? "Back to production" : "Open inbound"}
								</Button>
							)}
							{query.data.receivingEnabled && (
								<Button
									size="sm"
									disabled={!inbound.canReceive || receive.isPending || cancel.isPending}
									title={workerMode ? undefined : (inbound.reason ?? undefined)}
									onClick={() => {
										const identity = `${inbound.id}:${inbound.revision}`;
										const idempotencyKey =
											requests.current.get(identity) ?? crypto.randomUUID();
										requests.current.set(identity, idempotencyKey);
										receive.mutate({
											salesOrderId,
											inboundId: inbound.id,
											expectedRevision: inbound.revision,
											idempotencyKey,
										});
									}}
								>
									{receive.isPending &&
									receive.variables &&
									receive.variables.inboundId === inbound.id
										? "Receiving…"
										: workerMode
											? "Yes, received"
											: "Mark as received"}
								</Button>
							)}
						</div>
					</div>
				))}
			</div>
			{(cursor || query.data.nextCursor) && (
				<div className="flex gap-2">
					{cursor && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setCursor(undefined)}
						>
							First page
						</Button>
					)}
					{query.data.nextCursor && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setCursor(query.data.nextCursor ?? undefined)}
						>
							Next inbounds
						</Button>
					)}
				</div>
			)}
		</section>
	);
}
