"use client";

import { printSelectedJobs } from "@/lib/job-print";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { JobRow } from "./columns";
import { useContractorJobsTableStore } from "./store";

type Props = {
	data: JobRow[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useContractorJobsTableStore();
	const selectedIds = data
		.filter((item) => rowSelection[String(item.id)])
		.map((item) => item.id);
	const selectedCount = selectedIds.length;

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !selectedCount) {
		return null;
	}

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[560px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 min-w-max items-center justify-between gap-3 pl-4 pr-2">
					<span className="text-sm">{selectedCount} selected</span>
					<div className="flex items-center gap-1">
						<PrintSelected selectedIds={selectedIds} />
						<BulkReview
							selectedIds={selectedIds}
							action="approve"
							onDone={() => setRowSelection({})}
						/>
						<BulkReview
							selectedIds={selectedIds}
							action="reject"
							onDone={() => setRowSelection({})}
						/>
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							<span>Deselect all</span>
						</Button>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
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
			<Icons.Printer size={12} className="mr-1" />
			Print Selected
		</Button>
	);
}

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
				queryClient.invalidateQueries({
					queryKey: trpc.jobs.getJobs.infiniteQueryKey(),
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
	const Icon = isApprove ? Icons.CheckCircle2 : Icons.XCircle;

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
			title: `${label} requested for ${selectedIds.length} job${
				selectedIds.length !== 1 ? "s" : ""
			}`,
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
				<Icons.Loader2 size={12} className="mr-1 animate-spin" />
			) : (
				<Icon size={12} className="mr-1" />
			)}
			{label}
		</Button>
	);
}
