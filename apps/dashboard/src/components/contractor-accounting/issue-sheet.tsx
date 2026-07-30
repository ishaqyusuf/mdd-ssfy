"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

type Resolution =
	RouterInputs["contractorAccounting"]["resolveIssue"]["resolution"];

function label(value: string) {
	return value.replaceAll("_", " ").toLowerCase();
}

export function ContractorIssueSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, setParams } = useContractorAccountingFilterParams();
	const [note, setNote] = useState("");
	const [resolution, setResolution] = useState<Resolution>("verified");
	const open = Boolean(params.issueId);
	const issue = useQuery({
		...trpc.contractorAccounting.resolutionIssue.queryOptions({
			id: params.issueId || "",
		}),
		enabled: open,
	});
	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.contractorAccounting.resolutionIssues.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.contractorAccounting.resolutionIssue.queryKey({
					id: params.issueId || "",
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.contractorAccounting.closeReadiness.pathKey(),
			}),
		]);
	};
	const start = useMutation(
		trpc.contractorAccounting.startResolution.mutationOptions({
			async onSuccess() {
				toast({ title: "Resolution session opened" });
				await invalidate();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Resolution session not opened",
					description: error.message,
				});
			},
		}),
	);
	const resolve = useMutation(
		trpc.contractorAccounting.resolveIssue.mutationOptions({
			async onSuccess() {
				setNote("");
				toast({ title: "Reconciliation issue resolved" });
				await invalidate();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Issue not resolved",
					description: error.message,
				});
			},
		}),
	);

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) void setParams({ issueId: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader className="text-left">
					<SheetTitle>Reconciliation evidence</SheetTitle>
					<SheetDescription>
						Resolution is append-only and becomes stale if the underlying
						evidence changes.
					</SheetDescription>
				</SheetHeader>
				{issue.data ? (
					<div className="mt-6 space-y-5">
						<div className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{label(issue.data.code)}</p>
									<p className="mt-2 text-sm text-muted-foreground">
										{issue.data.message}
									</p>
								</div>
								<Badge variant="outline">
									{label(issue.data.resolutionStatus)}
								</Badge>
							</div>
							<dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
								<div>
									<dt className="text-muted-foreground">Expected</dt>
									<dd className="mt-1 font-mono">
										{issue.data.expectedAmount?.toString() || "—"}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Actual</dt>
									<dd className="mt-1 font-mono">
										{issue.data.actualAmount?.toString() || "—"}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Difference</dt>
									<dd className="mt-1 font-mono">
										{issue.data.differenceAmount?.toString() || "—"}
									</dd>
								</div>
							</dl>
						</div>

						{issue.data.resolutionStatus !== "in_progress" ? (
							<Button
								className="w-full"
								disabled={start.isPending}
								onClick={() =>
									start.mutate({ id: issue.data.id, note: note || undefined })
								}
							>
								{issue.data.resolutionStatus === "stale"
									? "Open against current evidence"
									: "Start resolution"}
							</Button>
						) : (
							<div className="space-y-3 rounded-xl border p-4">
								<Select
									value={resolution}
									onValueChange={(value) => setResolution(value as Resolution)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[
											"verified",
											"corrected_source",
											"accepted_legacy",
											"duplicate_record",
										].map((value) => (
											<SelectItem key={value} value={value}>
												{label(value)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Textarea
									value={note}
									onChange={(event) => setNote(event.target.value)}
									placeholder="Describe the evidence and resolution"
								/>
								<Button
									className="w-full"
									disabled={note.trim().length < 3 || resolve.isPending}
									onClick={() =>
										resolve.mutate({
											id: issue.data.id,
											note,
											resolution,
										})
									}
								>
									Resolve against current evidence
								</Button>
							</div>
						)}

						<div>
							<p className="font-medium text-sm">Resolution history</p>
							<div className="mt-3 space-y-2">
								{issue.data.resolutionHistory.map((event) => (
									<div key={event.id} className="rounded-lg bg-muted/50 p-3">
										<p className="text-xs font-medium">
											{label(event.action || "unknown")}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{event.note || "No note"} ·{" "}
											{event.createdAt
												? new Date(event.createdAt).toLocaleString()
												: "Unknown time"}
										</p>
									</div>
								))}
								{!issue.data.resolutionHistory.length ? (
									<p className="text-sm text-muted-foreground">
										No resolution activity yet.
									</p>
								) : null}
							</div>
						</div>
					</div>
				) : (
					<div className="mt-6 h-72 animate-pulse rounded-xl bg-muted/40" />
				)}
			</SheetContent>
		</Sheet>
	);
}
