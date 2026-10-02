"use client";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

type Plan = RouterOutputs["inventories"]["salesFormStockPlan"];
export function SalesStockApplicationDialog({
	salesOrderId,
	open,
	onClose,
	initialPlan,
}: {
	salesOrderId: number;
	open: boolean;
	onClose: () => void;
	initialPlan?: Plan;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const client = useQueryClient();
	const query = useQuery(
		trpc.inventories.salesFormStockPlan.queryOptions(
			{ salesOrderId },
			{ enabled: open, initialData: initialPlan },
		),
	);
	const plan = query.data;
	const mutation = useMutation(
		trpc.inventories.applySalesFormStock.mutationOptions({
			onSuccess: async (result) => {
				await client.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				await client.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.pathKey(),
				});
				await client.invalidateQueries({
					queryKey: trpc.sales.getOrders.pathKey(),
				});
				toast({
					title: "Stock applied",
					description: `${result.appliedQty} units applied to this sale.`,
					variant: "success",
				});
				onClose();
			},
			onError: async (error) => {
				toast({
					title: "Unable to apply stock",
					description: error.message,
					variant: "destructive",
				});
				await query.refetch();
			},
		}),
	);
	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				if (!value && !mutation.isPending) onClose();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Apply available warehouse stock?</DialogTitle>
					<DialogDescription>
						Confirm these quantities. Remaining shortages can be ordered as
						inbound. Stock is checked again when you apply it.
					</DialogDescription>
				</DialogHeader>
				{query.isPending ? (
					<p>Checking stock…</p>
				) : query.isError ? (
					<div role="alert">
						<p>{query.error.message}</p>
						<Button variant="outline" onClick={() => query.refetch()}>
							Retry stock check
						</Button>
					</div>
				) : (
					<div className="max-h-80 space-y-2 overflow-y-auto">
						{plan?.rows
							.filter((row) => row.applyQty > 0)
							.map((row) => (
								<div
									key={row.key}
									className="flex justify-between gap-3 border-b py-2 text-sm"
								>
									<span>{row.title}</span>
									<span className="shrink-0">
										Apply {row.applyQty} / {row.required}
									</span>
								</div>
							))}
						{plan?.blockReason ? <p>{plan.blockReason}</p> : null}
					</div>
				)}
				<DialogFooter>
					<Button
						variant="outline"
						disabled={mutation.isPending}
						onClick={onClose}
					>
						Not now
					</Button>
					<Button
						disabled={
							!plan?.canApply ||
							query.isFetching ||
							query.isError ||
							mutation.isPending ||
							!plan.rows.some((row) => row.applyQty > 0) ||
							!(auth.can.editOrders || auth.can.editInboundOrder)
						}
						onClick={() =>
							plan &&
							mutation.mutate({ salesOrderId, expectedRevision: plan.revision })
						}
					>
						{mutation.isPending ? "Applying…" : "Apply stock"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
