"use client";

import type { SalesQueryRef } from "@/lib/query-events/types";
import { useTRPC } from "@/trpc/client";
import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusLabel,
} from "@gnd/sales/order-status";
import type { SalesWorkflowCancellationAction } from "@gnd/sales/sales-workflow-cancellation";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type SalesWorkflowCancellationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	salesOrderId: number;
	orderNo?: string | null;
	action: SalesWorkflowCancellationAction;
	salesRefs: readonly SalesQueryRef[];
};

function lifecycleLabel(status?: SalesOrderLifecycleStatus) {
	return status ? getSalesOrderLifecycleStatusLabel(status) : "—";
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function SalesWorkflowCancellationDialog({
	open,
	onOpenChange,
	salesOrderId,
	orderNo,
	action,
	salesRefs,
}: SalesWorkflowCancellationDialogProps) {
	const trpc = useTRPC();
	const [reason, setReason] = useState("");
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const preview = useQuery({
		...trpc.sales.workflowCancellationPreview.queryOptions({
			salesOrderId,
			action,
		}),
		enabled: open,
		refetchOnWindowFocus: false,
	});
	const mutation = useMutation(
		trpc.sales.cancelWorkflowLayer.mutationOptions({
			meta: {
				queryEventScope: { sales: salesRefs },
			},
			onSuccess: (result) => {
				toast({
					title: `${action === "production" ? "Production" : "Fulfillment"} cancelled`,
					description: `Order is now ${lifecycleLabel(result.resultingLifecycle).toLowerCase()}.`,
					variant: "success",
				});
				onOpenChange(false);
			},
			onError: (error) => {
				toast({
					title: `Unable to cancel ${action}`,
					description: error.message,
					variant: "destructive",
				});
				void preview.refetch();
			},
		}),
	);

	useEffect(() => {
		if (!open) {
			setReason("");
			return;
		}
		setRequestId(crypto.randomUUID());
	}, [open]);

	const data = preview.data;
	const canConfirm =
		Boolean(data?.allowed) &&
		!preview.isFetching &&
		!mutation.isPending &&
		reason.trim().length >= 3;
	const effectLines = data
		? action === "fulfillment"
			? [
					countLabel(data.effects.dispatchIds.length, "dispatch", "dispatches"),
					countLabel(data.effects.packedItemIds.length, "packing row"),
					countLabel(
						data.effects.paymentReviewIds.length,
						"automatic payment review",
					),
				]
			: [
					countLabel(
						data.effects.automaticSubmissionIds.length,
						"automatic submission",
					),
					countLabel(
						data.effects.cancelledMaterialReviewIds.length,
						"material review",
					),
					countLabel(
						data.effects.deletedPendingPayrollIds.length,
						"pending payroll row",
					),
					countLabel(
						data.effects.paymentReviewIds.length,
						"automatic payment review",
					),
				]
		: [];

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!mutation.isPending) onOpenChange(nextOpen);
			}}
		>
			<DialogContent
				className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
				onClick={(event) => event.stopPropagation()}
			>
				<DialogHeader>
					<DialogTitle>
						Cancel {action === "production" ? "Production" : "Fulfillment"}
					</DialogTitle>
					<DialogDescription>
						Review the reversible layer for order{" "}
						{data?.orderNo || orderNo || salesOrderId}.
					</DialogDescription>
				</DialogHeader>

				{preview.isLoading ? (
					<div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
						<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						Reviewing current workflow evidence…
					</div>
				) : preview.isError ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						{preview.error.message}
					</div>
				) : data ? (
					<div className="space-y-4">
						<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border bg-muted/20 p-3 text-sm">
							<div>
								<div className="text-xs text-muted-foreground">Current</div>
								<div className="font-medium">
									{lifecycleLabel(data.currentLifecycle)}
								</div>
							</div>
							<Icons.ArrowRight className="size-4 text-muted-foreground" />
							<div className="text-right">
								<div className="text-xs text-muted-foreground">
									After cancellation
								</div>
								<div className="font-medium">
									{lifecycleLabel(data.resultingLifecycle)}
								</div>
							</div>
						</div>

						{data.blockers.length ? (
							<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
								<div className="text-sm font-medium text-destructive">
									Cancellation blocked
								</div>
								<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
									{data.blockers.map((blocker, index) => (
										<li key={`${blocker.code}-${blocker.resourceId || index}`}>
											{blocker.message}
										</li>
									))}
								</ul>
							</div>
						) : (
							<div className="rounded-md border p-3">
								<div className="text-sm font-medium">Reversible effects</div>
								<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
									{effectLines.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
							</div>
						)}

						<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
							<div className="font-medium">Preserved evidence</div>
							<p className="mt-1 text-muted-foreground">
								{data.preserved.message}
							</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{countLabel(
									data.preserved.inboundShipmentIds.length,
									"inbound shipment",
								)}{" "}
								· {data.preserved.receivedInboundQty} received ·{" "}
								{countLabel(
									data.preserved.stockMovementCount,
									"stock movement",
								)}{" "}
								·{" "}
								{countLabel(
									data.preserved.manualSubmissionIds.length,
									"manual production submission",
								)}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor={`workflow-cancellation-reason-${salesOrderId}`}>
								Cancellation reason
							</Label>
							<Textarea
								id={`workflow-cancellation-reason-${salesOrderId}`}
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								placeholder="Explain why this workflow layer is being reversed."
								maxLength={500}
								disabled={!data.allowed || mutation.isPending}
							/>
							<div className="text-right text-xs text-muted-foreground">
								{reason.length}/500
							</div>
						</div>
					</div>
				) : null}

				<DialogFooter className="gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={mutation.isPending}
						onClick={() => onOpenChange(false)}
					>
						Keep current state
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={!canConfirm}
						onClick={() => {
							if (!data) return;
							mutation.mutate({
								salesOrderId,
								action,
								expectedRevision: data.revision,
								requestId,
								reason: reason.trim(),
							});
						}}
					>
						{mutation.isPending ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						Cancel {action === "production" ? "production" : "fulfillment"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
