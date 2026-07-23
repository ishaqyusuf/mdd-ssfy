"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

type ProjectionRun =
	RouterOutputs["inventories"]["inventoryImportProjectionHistory"]["runs"][number];

function formatAttemptDate(value: Date | string | null) {
	if (!value) return "Not recorded";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "Not recorded";
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function statusLabel(status: ProjectionRun["status"]) {
	switch (status) {
		case "RUNNING":
			return "Queued";
		case "SUCCEEDED":
			return "Succeeded";
		case "START_FAILED":
			return "Queue failed";
		case "FAILED":
			return "Failed";
		case "CANCELED":
			return "Canceled";
		case "STALE":
			return "Stale";
		default:
			return status;
	}
}

function statusClassName(status: ProjectionRun["status"]) {
	switch (status) {
		case "START_FAILED":
		case "FAILED":
		case "STALE":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "SUCCEEDED":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "RUNNING":
			return "border-sky-200 bg-sky-50 text-sky-700";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

export function InventoryImportProjectionHistory({
	enabled,
}: {
	enabled: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [retryingDiagnosticId, setRetryingDiagnosticId] = useState<
		string | null
	>(null);
	const historyOptions =
		trpc.inventories.inventoryImportProjectionHistory.queryOptions(
			{ limit: 8 },
			{
				enabled,
				refetchOnWindowFocus: false,
				staleTime: 15 * 1000,
			},
		);
	const history = useQuery(historyOptions);
	const retry = useMutation(
		trpc.inventories.retryInventoryImportProjection.mutationOptions({
			onSuccess: async (result) => {
				if (result.status === "queued") {
					toast({
						title: "Inventory projection retry queued",
						variant: "success",
					});
				} else if (result.status === "queue_failed") {
					toast({
						title: "Projection retry could not be queued",
						description: result.projectionDiagnosticRecorded
							? "The failed retry was recorded and remains retryable."
							: "The queue and diagnostic write both need operator review.",
						variant: "destructive",
					});
				} else {
					toast({
						title: "Projection retry skipped",
						description: result.reason.replaceAll("_", " "),
						variant: "destructive",
					});
				}
				await queryClient.invalidateQueries({
					queryKey: historyOptions.queryKey,
				});
			},
			onError: () => {
				toast({
					title: "Projection retry failed",
					variant: "destructive",
				});
			},
			onSettled: () => {
				setRetryingDiagnosticId(null);
			},
		}),
	);

	return (
		<Card className="p-5">
			<div className="space-y-1">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h3 className="font-semibold">Recent Retained-Item Projections</h3>
					{history.data ? (
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">{history.data.meta.queued} queued</Badge>
							<Badge
								variant={
									history.data.meta.retryable ? "destructive" : "secondary"
								}
							>
								{history.data.meta.retryable} retryable
							</Badge>
						</div>
					) : null}
				</div>
				<p className="text-sm text-muted-foreground">
					Actor-attributed queue evidence for inventory-to-Dyke projection after
					a retained item is moved.
				</p>
			</div>

			{!enabled || history.isPending ? (
				<div
					className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
					aria-live="polite"
				>
					Loading recent projection attempts…
				</div>
			) : history.isError ? (
				<output className="mt-4 block rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					Projection attempt history is unavailable.
				</output>
			) : history.data?.runs.length ? (
				<div className="mt-4 grid gap-2 lg:grid-cols-2">
					{history.data.runs.map((run) => {
						const retrying = retry.isPending && retryingDiagnosticId === run.id;
						return (
							<div
								key={run.id}
								className="min-w-0 rounded-lg border bg-muted/20 p-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate text-sm font-medium">
											Inventory item {run.inventoryId}
										</div>
										<div className="mt-0.5 text-xs text-muted-foreground">
											{formatAttemptDate(run.startedAt || run.createdAt)}
											{run.actorName ? ` · ${run.actorName}` : ""}
										</div>
									</div>
									<Badge
										variant="outline"
										className={`${statusClassName(run.status)} shrink-0`}
									>
										{statusLabel(run.status)}
									</Badge>
								</div>
								<div className="mt-2 flex min-w-0 items-center justify-between gap-3">
									<span className="truncate font-mono text-xs text-muted-foreground">
										{run.runId?.slice(0, 12) || "no run id"}
									</span>
									{run.canRetry ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											disabled={retry.isPending}
											onClick={() => {
												setRetryingDiagnosticId(run.id);
												retry.mutate({ diagnosticId: run.id });
											}}
										>
											{retrying ? "Retrying…" : "Retry projection"}
										</Button>
									) : run.retryOfDiagnosticId ? (
										<span className="shrink-0 text-xs text-muted-foreground">
											Retry attempt
										</span>
									) : null}
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
					No retained-item projection attempts yet.
				</div>
			)}
		</Card>
	);
}
