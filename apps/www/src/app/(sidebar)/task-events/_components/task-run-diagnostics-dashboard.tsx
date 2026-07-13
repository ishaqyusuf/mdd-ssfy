"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useMemo, useState } from "react";

type DiagnosticStatus =
	| "ALL"
	| "RUNNING"
	| "SUCCEEDED"
	| "FAILED"
	| "CANCELED"
	| "STALE"
	| "START_FAILED";
type FilterableDiagnosticStatus = Exclude<DiagnosticStatus, "ALL">;

const statuses: Array<{ value: DiagnosticStatus; label: string }> = [
	{ value: "ALL", label: "All statuses" },
	{ value: "FAILED", label: "Failed" },
	{ value: "START_FAILED", label: "Start failed" },
	{ value: "RUNNING", label: "Running" },
	{ value: "SUCCEEDED", label: "Succeeded" },
	{ value: "CANCELED", label: "Canceled" },
	{ value: "STALE", label: "Stale" },
];

export function TaskRunDiagnosticsDashboard() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<DiagnosticStatus>("ALL");
	const input = useMemo(() => {
		const selectedStatus: FilterableDiagnosticStatus | undefined =
			status === "ALL" ? undefined : status;

		return {
			q: search.trim() || undefined,
			status: selectedStatus,
			size: 50,
		};
	}, [search, status]);
	const { data, isPending } = useQuery(
		trpc.taskRunDiagnostics.list.queryOptions(input),
	);
	const markReviewed = useMutation(
		trpc.taskRunDiagnostics.markReviewed.mutationOptions({
			onSuccess: async () => {
				toast({
					variant: "success",
					title: "Diagnostic reviewed",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.taskRunDiagnostics.list.queryKey(),
				});
			},
			onError: (error) => {
				toast({
					variant: "destructive",
					title: "Unable to mark reviewed",
					description: error.message,
				});
			},
		}),
	);

	const diagnostics = data?.list ?? [];

	return (
		<div className="grid gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search run, task, user, error..."
						className="md:max-w-sm"
					/>
					<Select
						value={status}
						onValueChange={(value) => setStatus(value as DiagnosticStatus)}
					>
						<SelectTrigger className="md:w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statuses.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button variant="outline" size="sm" asChild>
					<Link href="/task-events">Task Events</Link>
				</Button>
			</div>

			<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[130px]">Status</TableHead>
							<TableHead>Task</TableHead>
							<TableHead>Entity</TableHead>
							<TableHead>User</TableHead>
							<TableHead>Started</TableHead>
							<TableHead>Error</TableHead>
							<TableHead className="w-[120px] text-right">Review</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isPending ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="h-24 text-center text-muted-foreground"
								>
									Loading...
								</TableCell>
							</TableRow>
						) : diagnostics.length ? (
							diagnostics.map((diagnostic) => (
								<TableRow key={diagnostic.id}>
									<TableCell>
										<StatusBadge status={String(diagnostic.status)} />
									</TableCell>
									<TableCell className="min-w-[220px]">
										<div className="font-medium">
											{diagnostic.title || diagnostic.taskName}
										</div>
										<div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
											{diagnostic.runId || diagnostic.taskName}
										</div>
									</TableCell>
									<TableCell className="min-w-[180px]">
										<div>{diagnostic.entityLabel || "-"}</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{[diagnostic.entityType, diagnostic.entityId]
												.filter(Boolean)
												.join(" / ") || "-"}
										</div>
									</TableCell>
									<TableCell className="min-w-[180px]">
										<div>{diagnostic.actorName || "-"}</div>
										<div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
											{diagnostic.actorEmail || "-"}
										</div>
									</TableCell>
									<TableCell className="min-w-[150px] text-sm">
										{formatDate(diagnostic.startedAt || diagnostic.createdAt)}
									</TableCell>
									<TableCell className="max-w-[360px]">
										<div className="line-clamp-2 text-sm">
											{diagnostic.internalError ||
												formatOutputSummary(diagnostic.outputSummary) ||
												diagnostic.userMessage ||
												"-"}
										</div>
									</TableCell>
									<TableCell className="text-right">
										{diagnostic.reviewedAt ? (
											<span className="text-xs text-muted-foreground">
												Reviewed
											</span>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={markReviewed.isPending}
												onClick={() =>
													markReviewed.mutate({
														id: diagnostic.id,
													})
												}
											>
												Review
											</Button>
										)}
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={7}
									className="h-24 text-center text-muted-foreground"
								>
									No diagnostics found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	if (status === "FAILED" || status === "START_FAILED" || status === "STALE") {
		return <Badge variant="destructive">{statusLabel(status)}</Badge>;
	}

	if (status === "SUCCEEDED") {
		return <Badge variant="default">{statusLabel(status)}</Badge>;
	}

	return <Badge variant="secondary">{statusLabel(status)}</Badge>;
}

function statusLabel(status: string) {
	return status
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleString();
}

function formatOutputSummary(value: unknown) {
	if (!value || typeof value !== "object") return null;
	const summary = value as Record<string, unknown>;
	const emails = summary.emails as Record<string, unknown> | undefined;

	if (emails && typeof emails === "object") {
		return `Emails sent: ${Number(emails.sent || 0)}, failed: ${Number(
			emails.failed || 0,
		)}, skipped: ${Number(emails.skipped || 0)}`;
	}

	if (summary.present) return "Output captured.";

	return null;
}
