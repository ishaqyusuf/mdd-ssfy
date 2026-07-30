"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { ArrowUpRight } from "lucide-react";

export function ContractorPayoutRunsSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, setParams } = useContractorAccountingFilterParams();
	const open = Boolean(params.managePayoutRuns);
	const runs = useQuery({
		...trpc.contractorAccounting.payoutRuns.queryOptions({}),
		enabled: open,
	});
	const update = useMutation(
		trpc.contractorAccounting.updatePayoutRun.mutationOptions({
			async onSuccess(run, variables) {
				toast({ title: `Payout run marked ${run.status.toLowerCase()}` });
				await queryClient.invalidateQueries({
					queryKey: trpc.contractorAccounting.payoutRuns.queryKey(),
				});
				if (variables.status === "HANDED_OFF") {
					window.location.href = `/contractors/jobs/payment-portal?contractorId=${run.contractorId}`;
				}
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Payout run not updated",
					description: error.message,
				});
			},
		}),
	);
	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) void setParams({ managePayoutRuns: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>Draft payout runs</SheetTitle>
					<SheetDescription>
						Accounting prepares and reviews immutable snapshots here. Payment
						execution remains in Payment Portal.
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6 space-y-3">
					{runs.data?.map((run) => (
						<div key={run.id} className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">
										{run.contractor?.name || `Contractor #${run.contractorId}`}
									</p>
									<p className="mt-1 font-mono text-sm">
										${Number(run.proposedAmount).toFixed(2)}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{Array.isArray(run.jobIds) ? run.jobIds.length : 0} job(s) ·{" "}
										{new Date(run.createdAt).toLocaleString()}
									</p>
								</div>
								<Badge variant="outline">{run.status}</Badge>
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								{run.status === "DRAFT" ? (
									<Button
										size="sm"
										disabled={update.isPending}
										onClick={() =>
											update.mutate({ id: run.id, status: "READY" })
										}
									>
										Mark ready
									</Button>
								) : null}
								{run.status === "READY" ? (
									<Button
										size="sm"
										disabled={update.isPending}
										onClick={() =>
											update.mutate({ id: run.id, status: "HANDED_OFF" })
										}
									>
										Open Payment Portal
										<ArrowUpRight className="ml-2 size-4" />
									</Button>
								) : null}
								{["DRAFT", "READY", "HANDED_OFF"].includes(run.status) ? (
									<Button
										size="sm"
										variant="outline"
										disabled={update.isPending}
										onClick={() =>
											update.mutate({
												id: run.id,
												status: "CANCELLED",
												reason: "Cancelled from accounting workspace",
											})
										}
									>
										Cancel
									</Button>
								) : null}
							</div>
						</div>
					))}
					{runs.isPending ? (
						<div className="h-64 animate-pulse rounded-xl bg-muted/40" />
					) : null}
					{runs.data && !runs.data.length ? (
						<p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
							No payout runs yet. Create one from a ready contractor in
							Payables.
						</p>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
