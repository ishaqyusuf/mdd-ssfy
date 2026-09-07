"use client";

import { SalesCompletionFallbackDialog } from "@/components/sales-completion-fallback-dialog";
import { toSalesCompletionDateValue } from "@/components/sales-completion-presentation";
import { useAuth } from "@/hooks/use-auth";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import {
	type PendingSalesCompletionFallback,
	useTaskMonitorStore,
} from "@/store/task-monitor";
import { useTRPC } from "@/trpc/client";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function SalesCompletionFallbackProvider() {
	const auth = useAuth();
	const pendingAttempts = useTaskMonitorStore(
		(state) => state.pendingSalesCompletionFallbacks,
	);
	const canEdit =
		auth.can.editStatusOnlySalesCompletion === true ||
		auth.can.editOrders === true;
	const ownerId = auth.id == null ? null : String(auth.id);
	const attempt = pendingAttempts.find(
		(item) => !item.ownerId || item.ownerId === ownerId,
	);
	if (!attempt || !canEdit) return null;
	return <SalesCompletionFallbackAttempt key={attempt.id} attempt={attempt} />;
}

function SalesCompletionFallbackAttempt({
	attempt,
}: {
	attempt: PendingSalesCompletionFallback;
}) {
	const trpc = useTRPC();
	const sq = useSalesQueryClient();
	const removeAttempt = useTaskMonitorStore(
		(state) => state.removeSalesCompletionFallback,
	);
	const [reason, setReason] = useState("");
	const [effectiveDate, setEffectiveDate] = useState(() =>
		attempt.milestone === "FULFILLMENT_COMPLETED"
			? toSalesCompletionDateValue()
			: "",
	);

	const previewQuery = useQuery(
		trpc.sales.salesCompletionStatusOnlyFallbackPreview.queryOptions(
			{
				milestone: attempt.milestone,
				fullWorkflowRequestId: attempt.fullWorkflowRequestId,
			},
			{
				staleTime: 0,
				refetchOnWindowFocus: true,
			},
		),
	);
	const mutation = useMutation(
		trpc.sales.markSalesCompletionStatusOnlyFallback.mutationOptions(),
	);

	useEffect(() => {
		if (previewQuery.isSuccess && previewQuery.data.items.length === 0) {
			removeAttempt(attempt.id);
		}
	}, [attempt.id, previewQuery.data, previewQuery.isSuccess, removeAttempt]);

	const submit = async () => {
		const preview = previewQuery.data;
		const normalizedReason = reason.trim();
		if (!preview || !normalizedReason) return;
		const candidates = preview.items.flatMap((item) =>
			item.eligible && item.completionRevision && item.pipelineRevision
				? [
						{
							salesOrderId: item.salesOrderId,
							expectedCompletionRevision: item.completionRevision,
							expectedPipelineRevision: item.pipelineRevision,
							administrativeOverrideRequired:
								item.administrativeOverrideRequired,
						},
					]
				: [],
		);
		if (!candidates.length) return;

		try {
			const result = await mutation.mutateAsync({
				milestone: attempt.milestone,
				fullWorkflowRequestId: attempt.fullWorkflowRequestId,
				requestId: crypto.randomUUID(),
				reason: normalizedReason,
				effectiveAt: effectiveDate
					? new Date(`${effectiveDate}T12:00:00.000Z`)
					: null,
				candidates,
			});
			await sq.events.pipelineUpdated();
			const recorded = result.completed + result.replayed;
			const unresolved = result.skipped + result.failed;
			if (!unresolved) {
				removeAttempt(attempt.id);
			} else {
				await previewQuery.refetch();
			}
			toast({
				title: `${
					attempt.milestone === "PRODUCTION_COMPLETED"
						? "Production"
						: "Fulfillment"
				} completed — status only`,
				description: `${recorded} unsuccessful order${recorded === 1 ? "" : "s"} recorded as status only.${result.skipped ? ` ${result.skipped} skipped after revalidation.` : ""}${result.failed ? ` ${result.failed} failed.` : ""}`,
				variant: result.failed ? "destructive" : "success",
			});
		} catch (error) {
			toast({
				title: "Unable to apply status-only fallback",
				description:
					error instanceof Error ? error.message : "Refresh and try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<SalesCompletionFallbackDialog
			open
			milestone={
				attempt.milestone === "PRODUCTION_COMPLETED"
					? "Production"
					: "Fulfillment"
			}
			preview={previewQuery.data}
			previewPending={previewQuery.isPending}
			previewError={previewQuery.isError}
			submitPending={mutation.isPending}
			reason={reason}
			effectiveDate={effectiveDate}
			onOpenChange={(open) => {
				if (!open) removeAttempt(attempt.id);
			}}
			onReasonChange={setReason}
			onEffectiveDateChange={setEffectiveDate}
			onRetryPreview={() => void previewQuery.refetch()}
			onConfirm={() => void submit()}
		/>
	);
}
