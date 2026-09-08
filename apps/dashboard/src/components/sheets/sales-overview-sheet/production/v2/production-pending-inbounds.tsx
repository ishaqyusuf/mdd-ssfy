"use client";

import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useRef, useState } from "react";

export function ProductionPendingInbounds({
	salesOrderId,
	inventoryMode = false,
}: { salesOrderId: number; inventoryMode?: boolean }) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const { setParams } = useSalesOverviewQuery();
	const { setInventorySegment, selectedInventoryInboundId } =
		useSalesInventorySegmentQuery();
	const [cursor, setCursor] = useState<number | undefined>();
	const requests = useRef(new Map<string, string>());
	const query = useQuery(
		trpc.sales.productionPendingInbounds.queryOptions({
			salesOrderId,
			inboundId: inventoryMode
				? (selectedInventoryInboundId ?? undefined)
				: undefined,
			cursor,
			take: 10,
		}),
	);
	const receive = useMutation(
		trpc.sales.receiveProductionInbound.mutationOptions({
			onSuccess: async (result) => {
				await client.invalidateQueries({
					queryKey: trpc.sales.productionPendingInbounds.queryKey(),
				});
				setCursor(undefined);
				toast({
					title: "Inbound materials received and applied to needs",
					description:
						result.remainingBackorderQty && result.remainingBackorderQty > 0
							? "Some material needs remain uncovered. See Inventory for details."
							: undefined,
					variant: "success",
				});
			},
			onError: async (error) => {
				toast({
					title: "Unable to receive inbound",
					description: error.message,
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
	if (!query.data?.count)
		return inventoryMode ? (
			<p className="text-sm text-muted-foreground">
				No pending receipt is available for this inbound.
			</p>
		) : null;
	return (
		<section className="space-y-3" aria-label="Materials need verification">
			<div>
				<h3 className="text-sm font-medium">Materials need verification</h3>
				<p className="text-xs text-muted-foreground">
					{query.data.count} pending inbound{query.data.count === 1 ? "" : "s"}
				</p>
			</div>
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
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									if (inventoryMode) setParams({ salesTab: "production" });
									else {
										setInventorySegment("inbounds", { inboundId: inbound.id });
										setParams({ salesTab: "inventory" });
									}
								}}
							>
								{inventoryMode ? "Back to production" : "Open inbound"}
							</Button>
							{query.data.receivingEnabled && (
								<Button
									size="sm"
									disabled={!inbound.canReceive || receive.isPending}
									title={inbound.reason ?? undefined}
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
