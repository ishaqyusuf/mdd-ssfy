"use client";

import { printSelectedJobs } from "@/lib/job-print";
import { BatchAction } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { CheckCircle2, Loader2, Printer, XCircle } from "lucide-react";
import type { JobItem } from "./columns";

function BulkReview({
	selectedIds,
	onDone,
	action,
}: {
	selectedIds: number[];
	onDone: () => void;
	action: "approve" | "reject";
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const reviewMutation = useMutation(
		trpc.jobs.jobReview.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.jobs.getJobs.pathKey(),
				});
			},
			onError(err) {
				toast({
					variant: "destructive",
					title: `Failed to ${action} job`,
					description: err.message,
				});
			},
		}),
	);

	const isApprove = action === "approve";
	const label = isApprove ? "Approve" : "Reject";
	const Icon = isApprove ? CheckCircle2 : XCircle;

	function handleClick() {
		for (const jobId of selectedIds) {
			reviewMutation.mutate({
				action,
				jobId,
				note: isApprove
					? "Approved from contractor jobs list."
					: "Rejected from contractor jobs list.",
			});
		}
		toast({
			variant: isApprove ? "success" : "destructive",
			title: `${label} requested for ${selectedIds.length} job${selectedIds.length !== 1 ? "s" : ""}`,
		});
		onDone();
	}

	return (
		<Button
			variant="ghost"
			className="rounded-none"
			disabled={reviewMutation.isPending}
			onClick={handleClick}
		>
			{reviewMutation.isPending ? (
				<Loader2 size={12} className="animate-spin mr-1" />
			) : (
				<Icon size={12} className="mr-1" />
			)}
			{label}
		</Button>
	);
}

function PrintSelected({ selectedIds }: { selectedIds: number[] }) {
	return (
		<Button
			variant="ghost"
			className="rounded-none"
			onClick={() =>
				printSelectedJobs({
					jobIds: selectedIds,
					context: "jobs-page",
				})
			}
		>
			<Printer size={12} className="mr-1" />
			Print Selected
		</Button>
	);
}

export function BatchActions() {
	const ctx = useTable();
	const selectedRows = ctx.selectedRows ?? [];
	if (!selectedRows.length) return null;

	const selectedIds = selectedRows
		.map((row) => (row.original as JobItem)?.id)
		.filter((id): id is number => typeof id === "number");

	function clearSelection() {
		ctx.table?.toggleAllPageRowsSelected(false);
	}

	return (
		<BatchAction>
			<PrintSelected selectedIds={selectedIds} />
			<BulkReview
				selectedIds={selectedIds}
				onDone={clearSelection}
				action="approve"
			/>
			<BulkReview
				selectedIds={selectedIds}
				onDone={clearSelection}
				action="reject"
			/>
		</BatchAction>
	);
}
