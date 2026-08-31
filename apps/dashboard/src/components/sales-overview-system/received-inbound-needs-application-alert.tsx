"use client";

import { useAuth } from "@/hooks/use-auth";
import { useInboundView } from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

import { useRefreshSalesInventoryQueries } from "./hooks/use-sales-inventory-actions";

const ATTENTION_TAKE = 20;

export function ReceivedInboundNeedsApplicationAlert({
	salesOrderId,
	onViewInbound,
}: {
	salesOrderId: number;
	onViewInbound?: (inboundId: number) => void;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setParams: setInboundViewParams } = useInboundView();
	const refreshSalesInventoryQueries =
		useRefreshSalesInventoryQueries(salesOrderId);
	const canApply = Boolean(auth.can?.editInboundOrder);
	const queryInput = { salesOrderId, take: ATTENTION_TAKE };
	const attentionQuery = useQuery(
		trpc.inventories.inboundNeedsApplicationAttention.queryOptions(queryInput, {
			enabled: canApply && salesOrderId > 0,
			staleTime: 30 * 1000,
			refetchOnWindowFocus: false,
		}),
	);
	const applyMutation = useMutation(
		trpc.inventories.applyInboundNeedsApplicationAttention.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					refreshSalesInventoryQueries({ includeInboundWorkspace: true }),
					queryClient.invalidateQueries({
						queryKey:
							trpc.inventories.inboundNeedsApplicationAttention.queryKey(
								queryInput,
							),
					}),
					queryClient.invalidateQueries({
						queryKey:
							trpc.inventories.inboundNeedsApplicationAttentionSummary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipmentDetail.pathKey(),
					}),
				]);
				toast({
					title: "Inbound applied to Needs",
					description: `${result.updatedDemandCount} material need${result.updatedDemandCount === 1 ? "" : "s"} updated.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to apply inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const rows = attentionQuery.data ?? [];

	if (!canApply || rows.length === 0) return null;

	return (
		<div className="space-y-2" aria-label="Received inbound pending application">
			{rows.map((row) => {
				const isApplying =
					applyMutation.isPending &&
					applyMutation.variables?.inboundIds.includes(row.inboundId);
				const pendingQty = Math.max(0, row.capacityQty - row.appliedQty);
				return (
					<Alert
						key={row.inboundId}
						className="border-amber-200 bg-amber-50/60 text-left [&>svg]:text-amber-700"
					>
						<Icons.AlertTriangle />
						<AlertTitle>Received inbound pending application</AlertTitle>
						<AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
							<span>
								Inbound{" "}
								<button
									type="button"
									className="font-medium text-foreground underline underline-offset-4 hover:text-amber-800"
									onClick={() => {
										if (onViewInbound) onViewInbound(row.inboundId);
										else setInboundViewParams({ viewInboundId: row.inboundId });
									}}
								>
									#{row.inboundId}
								</button>{" "}
								is received, with {pendingQty} material need
								{pendingQty === 1 ? "" : "s"} still pending application.
							</span>
							<Button
								type="button"
								size="sm"
								disabled={applyMutation.isPending}
								onClick={() =>
									applyMutation.mutate({ inboundIds: [row.inboundId] })
								}
							>
								{isApplying ? "Applying…" : "Apply"}
							</Button>
						</AlertDescription>
					</Alert>
				);
			})}
		</div>
	);
}
