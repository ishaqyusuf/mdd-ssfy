"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Card } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";

type InventoryImportRun =
	RouterOutputs["inventories"]["inventoryImportRunHistory"]["runs"][number];

function formatRunDate(value: Date | string | null) {
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

function statusLabel(status: InventoryImportRun["status"]) {
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

function statusClassName(status: InventoryImportRun["status"]) {
	switch (status) {
		case "FAILED":
		case "START_FAILED":
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

function runMetadata(value: unknown) {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function runScopeLabel(run: InventoryImportRun) {
	const metadata = runMetadata(run.metadata);
	const scope = typeof metadata.scope === "string" ? metadata.scope : null;
	const strategy =
		typeof metadata.strategy === "string" ? metadata.strategy : null;

	return [scope ? `${scope} scope` : null, strategy]
		.filter(Boolean)
		.join(" · ");
}

function runMessage(run: InventoryImportRun) {
	if (run.userMessage) return run.userMessage;
	return run.description || "Inventory import background task";
}

export function InventoryImportRunHistory({ enabled }: { enabled: boolean }) {
	const trpc = useTRPC();
	const history = useQuery(
		trpc.inventories.inventoryImportRunHistory.queryOptions(
			{ limit: 8 },
			{
				enabled,
				refetchOnWindowFocus: false,
				staleTime: 15 * 1000,
				refetchInterval: (query) =>
					query.state.data?.runs.some((run) => run.status === "RUNNING")
						? 5000
						: false,
			},
		),
	);

	return (
		<Card className="p-5">
			<div className="space-y-1">
				<h3 className="font-semibold">Recent Import Runs</h3>
				<p className="text-sm text-muted-foreground">
					Persisted operator, scope, strategy, outcome, and Trigger run identity
					for inventory updates and system checks.
				</p>
			</div>

			{!enabled || history.isPending ? (
				<div
					className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
					aria-live="polite"
				>
					Loading recent inventory import runs…
				</div>
			) : history.isError ? (
				<output className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					Recent import history is unavailable. Live run status remains visible
					in Import Actions.
				</output>
			) : history.data?.runs.length ? (
				<div className="mt-4 grid gap-2 lg:grid-cols-2">
					{history.data.runs.map((run) => (
						<div
							key={run.id}
							className="min-w-0 rounded-lg border bg-muted/20 p-3"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate text-sm font-medium">
										{run.title || "Inventory import"}
									</div>
									<div className="mt-0.5 text-xs text-muted-foreground">
										{formatRunDate(run.startedAt || run.createdAt)}
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
							<div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
								{runMessage(run)}
							</div>
							<div className="mt-2 flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
								<span className="truncate">
									{runScopeLabel(run) || "Import scope unavailable"}
								</span>
								<span className="shrink-0 font-mono">
									{run.runId?.slice(0, 10) || "no run id"}
								</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
					No persisted inventory import runs yet. The next queued update or
					system check will appear here.
				</div>
			)}
		</Card>
	);
}
