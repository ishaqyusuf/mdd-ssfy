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
	exactInboundId,
}: { salesOrderId: number; inventoryMode?: boolean; onOpenInventory?: (inboundId?: number) => void; exactInboundId?: number }) {
	const { selectedInventoryInboundId } = useSalesInventorySegmentQuery();
	return <ProductionInboundPanel
		key={`${exactInboundId ?? "all"}:${salesOrderId}:${inventoryMode ? `inbound:${selectedInventoryInboundId ?? "all"}` : "production"}`}
		salesOrderId={salesOrderId}
		inventoryMode={inventoryMode}
		onOpenInventory={onOpenInventory}
		exactInboundId={exactInboundId}
	/>;
}

function ProductionInboundPanel({
	salesOrderId,
	inventoryMode,
	onOpenInventory,
	exactInboundId,
}: { salesOrderId: number; inventoryMode: boolean; onOpenInventory?: (inboundId?: number) => void; exactInboundId?: number }) {
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
			inboundId: exactInboundId ?? (inventoryMode
				? (selectedInventoryInboundId ?? undefined)
				: undefined),
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
			<p className="text-sm text-muted-foreground">Loading inbounds…</p>
		);
	if (query.isError)
		return (
			<Button variant="outline" onClick={() => query.refetch()}>
				Retry inbounds
			</Button>
		);
	if (!query.data?.count && !query.data?.receipts.length)
		return workerMode && (received || query.data?.needsSupervisor) ? (
			<p className="text-sm" role="status">
				{query.data?.needsSupervisor
					? "Contact your supervisor. Some production details still need checking."
					: "Materials received."}
			</p>
		) : (
			<p className="text-sm text-muted-foreground">
				No linked inbounds.
			</p>
		);
	return (
		<section className="space-y-3" aria-label="Inbound materials">
			{!workerMode && cancel.error && (
				<p role="alert" className="text-sm text-destructive">
					Unable to cancel receipt. {cancel.error.message}
				</p>
			)}
			{<div>
				<h3 className="text-sm font-medium">
					Inbound materials
				</h3>
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
						className="flex flex-wrap items-center justify-between gap-3 py-3"
					>
						<div className="min-w-0 flex-1 basis-56">
							<p className="break-words text-sm font-semibold uppercase">{inbound.totalQty} qty from {inbound.supplier}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{inbound.expectedAt ? formatDate(inbound.expectedAt) : "Not scheduled"}
								{" · "}
								<span className={`font-bold uppercase ${inbound.status === "completed" ? "text-emerald-700" : inbound.status === "issue_open" ? "text-red-700" : inbound.status === "in_progress" ? "text-blue-700" : inbound.status === "pending" ? "text-amber-700" : "text-muted-foreground"}`}>{inbound.status === "completed" ? "Received" : inbound.status?.replaceAll("_", " ") || "Pending"}</span>
							</p>
							{(inventoryMode || exactInboundId) && (
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
							{!exactInboundId && (!workerMode || onOpenInventory) && (
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
							{query.data.receivingEnabled && inbound.items.length > 0 && !["closed", "completed"].includes(inbound.status) && (
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
										: workerMode && !exactInboundId
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
