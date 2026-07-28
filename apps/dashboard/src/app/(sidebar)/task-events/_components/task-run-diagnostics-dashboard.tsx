"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { TaskRunDiagnosticsColumnVisibility } from "@/components/tables-2/task-run-diagnostics/column-visibility";
import type { TaskRunDiagnosticsRow } from "@/components/tables-2/task-run-diagnostics/columns";
import {
	DataTable,
	type PageInfo as TaskRunDiagnosticsPageInfo,
} from "@/components/tables-2/task-run-diagnostics/data-table";
import { TaskRunDiagnosticsSkeleton } from "@/components/tables-2/task-run-diagnostics/skeleton";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";

type TaskRunDiagnosticsInput = NonNullable<
	RouterInputs["taskRunDiagnostics"]["list"]
>;
const TASK_DIAGNOSTIC_STATUSES = [
	"RUNNING",
	"SUCCEEDED",
	"FAILED",
	"CANCELED",
	"STALE",
	"START_FAILED",
] as const;
type StatusFilter = "all" | (typeof TASK_DIAGNOSTIC_STATUSES)[number];

type Props = {
	initialSettings?: Partial<TableSettings>;
};

function statusLabel(status: (typeof TASK_DIAGNOSTIC_STATUSES)[number]) {
	switch (status) {
		case "RUNNING":
			return "Running";
		case "SUCCEEDED":
			return "Succeeded";
		case "FAILED":
			return "Failed";
		case "CANCELED":
			return "Canceled";
		case "STALE":
			return "Stale";
		case "START_FAILED":
			return "Start failed";
		default:
			return status;
	}
}

export function TaskRunDiagnosticsDashboard({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);
	const [pageInfo, setPageInfo] = useState<TaskRunDiagnosticsPageInfo | null>(
		null,
	);
	const size = 50;

	const filters = useMemo(
		() =>
			({
				q: search.trim() || undefined,
				status: status === "all" ? undefined : status,
				page,
				size,
			}) satisfies TaskRunDiagnosticsInput,
		[page, search, status],
	);
	const hasFilters = Boolean(search.trim()) || status !== "all";

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.taskRunDiagnostics.list.pathKey(),
		});
	};

	const markReviewedMutation = useMutation(
		trpc.taskRunDiagnostics.markReviewed.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({
					variant: "success",
					title: "Diagnostic reviewed",
				});
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to mark reviewed",
					description: error.message,
				});
			},
		}),
	);

	const clearFilters = () => {
		setSearch("");
		setStatus("all");
		setPage(1);
	};

	const reviewingDiagnosticId =
		markReviewedMutation.isPending && markReviewedMutation.variables
			? markReviewedMutation.variables.id
			: null;

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px] lg:flex-1">
					<div className="grid gap-1.5">
						<Label htmlFor="task-run-diagnostics-search">Search</Label>
						<div className="relative">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="task-run-diagnostics-search"
								value={search}
								onChange={(event) => {
									setPage(1);
									setSearch(event.target.value);
								}}
								placeholder="Run, task, user, entity, or error"
								className="pl-9"
							/>
						</div>
					</div>
					<div className="grid gap-1.5">
						<Label>Status</Label>
						<Select
							value={status}
							onValueChange={(value) => {
								setPage(1);
								setStatus(value as StatusFilter);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								{TASK_DIAGNOSTIC_STATUSES.map((item) => (
									<SelectItem key={item} value={item}>
										{statusLabel(item)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<TaskRunDiagnosticsColumnVisibility />
					<Button
						type="button"
						variant="outline"
						onClick={() => void refresh()}
						disabled={pageInfo?.isFetching}
					>
						{pageInfo?.isFetching ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Icons.RefreshCw className="mr-2 size-4" />
						)}
						Refresh
					</Button>
					<Button variant="outline" asChild>
						<Link href="/task-events">Task Events</Link>
					</Button>
				</div>
			</div>

			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<TaskRunDiagnosticsSkeleton initialSettings={initialSettings} />
					}
				>
					<DataTable
						initialSettings={initialSettings}
						filters={filters}
						hasFilters={hasFilters}
						reviewingDiagnosticId={reviewingDiagnosticId}
						onClearFilters={clearFilters}
						onMarkReviewed={(diagnostic: TaskRunDiagnosticsRow) =>
							markReviewedMutation.mutate({ id: diagnostic.id })
						}
						onPageInfoChange={setPageInfo}
					/>
				</Suspense>
			</ErrorBoundary>

			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-muted-foreground">
					{pageInfo
						? `${pageInfo.total.toLocaleString()} diagnostic${
								pageInfo.total === 1 ? "" : "s"
							} • Page ${pageInfo.page} of ${pageInfo.pageCount}`
						: "Loading diagnostics"}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1 || pageInfo?.isFetching}
						onClick={() => setPage((value) => Math.max(1, value - 1))}
					>
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={
							Boolean(pageInfo && page >= pageInfo.pageCount) ||
							pageInfo?.isFetching
						}
						onClick={() =>
							setPage((value) =>
								Math.min(pageInfo?.pageCount ?? value, value + 1),
							)
						}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
