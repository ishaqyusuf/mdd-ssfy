"use client";

import { _trpc } from "@/components/static-trpc";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
	eventName: string;
};

type TaskHistoryMeta = {
	triggerType?: "scheduled" | "now" | "test" | string;
	statusUsed?: "active" | "inactive" | string;
	filterUsed?: Record<string, unknown> | null;
	found?: number;
	grouped?: number;
	sent?: number;
	skipped?: number;
	failed?: number;
	skippedSales?: Array<{
		saleId: number;
		orderId: string;
		customerName?: string | null;
		reasons?: string[];
		amountDue?: number;
	}>;
	successfulRecipients?: Array<{
		recipientRole: "customer" | "address";
		recipientId: number;
		recipientName: string;
		recipientEmail: string;
		salesCount: number;
		totalPendingAmount: number;
	}>;
	skippedSalesTruncated?: number;
	successfulRecipientsTruncated?: number;
};

export function TaskEventDetail({ eventName }: Props) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<"active" | "inactive">("active");
	const [filterText, setFilterText] = useState("{}");
	const [runId, setRunId] = useState<string | null>(null);
	const [syncedRunId, setSyncedRunId] = useState<string | null>(null);

	const { data, isPending, refetch } = useQuery(
		_trpc.taskEvents.get.queryOptions({ eventName }),
	);

	const historyQuery = useQuery(
		_trpc.taskEvents.history.queryOptions({ eventName }),
	);
	const refetchHistory = historyQuery.refetch;

	const runStatusQuery = useQuery(
		_trpc.taskEvents.runStatus.queryOptions(
			{
				runId: runId || "pending",
			},
			{
				enabled: !!runId,
				refetchInterval: (query) => {
					const status = query.state.data?.status;
					if (!status) return 1000;
					return status === "COMPLETED" || status === "FAILED" ? false : 1000;
				},
			},
		),
	);

	useEffect(() => {
		if (!data?.config) return;
		setStatus(data.config.status);
		setFilterText(JSON.stringify(data.config.filter || {}, null, 2));
	}, [data?.config]);

	useEffect(() => {
		const runStatus = runStatusQuery.data?.status;
		if (!runId || !runStatus || runId === syncedRunId) return;
		if (runStatus !== "COMPLETED" && runStatus !== "FAILED") return;

		setSyncedRunId(runId);
		void (async () => {
			await Promise.all([
				refetchHistory(),
				refetch(),
				queryClient.invalidateQueries({
					queryKey: _trpc.taskEvents.list.queryKey(),
				}),
			]);
		})();
	}, [
		queryClient,
		refetchHistory,
		refetch,
		runId,
		runStatusQuery.data?.status,
		syncedRunId,
	]);

	const saveMutation = useMutation(
		_trpc.taskEvents.update.mutationOptions({
			onSuccess: async () => {
				toast({
					variant: "success",
					title: "Task event updated",
				});
				await Promise.all([
					refetch(),
					historyQuery.refetch(),
					queryClient.invalidateQueries({
						queryKey: _trpc.taskEvents.list.queryKey(),
					}),
				]);
			},
		}),
	);

	const runNowMutation = useMutation(
		_trpc.taskEvents.runNow.mutationOptions({
			onSuccess: async (result) => {
				setRunId(result.id);
				setSyncedRunId(null);
				toast({
					variant: "success",
					title: "Run started",
					description: `Run ID: ${result.id}`,
				});
				await historyQuery.refetch();
			},
		}),
	);

	const runTestMutation = useMutation(
		_trpc.taskEvents.runTest.mutationOptions({
			onSuccess: async (result) => {
				setRunId(result.id);
				setSyncedRunId(null);
				toast({
					variant: "success",
					title: "Test run started",
					description: `Run ID: ${result.id}`,
				});
				await historyQuery.refetch();
			},
		}),
	);

	const runStatus = runStatusQuery.data?.status;
	const latestHistory = historyQuery.data?.list || [];
	const latestRun = latestHistory[0];
	const latestMeta = parseTaskHistoryMeta(latestRun?.meta);

	const parsedFilter = useMemo(() => {
		try {
			return JSON.parse(filterText || "{}");
		} catch {
			return null;
		}
	}, [filterText]);

	if (isPending) {
		return (
			<div className="text-sm text-muted-foreground">Loading event...</div>
		);
	}

	if (!data) {
		return (
			<div className="text-sm text-muted-foreground">Event not found.</div>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">{data.title}</h2>
					<p className="text-sm text-muted-foreground">{data.description}</p>
				</div>
				<div className="flex gap-2">
					<Badge variant={status === "active" ? "default" : "secondary"}>
						{status}
					</Badge>
					<Link href="/task-events">
						<Button variant="outline" size="sm">
							Back
						</Button>
					</Link>
				</div>
			</div>

			<div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
				<div>
					<div className="text-sm font-medium">Status</div>
					<div className="mt-2 flex gap-2">
						<Button
							size="sm"
							variant={status === "active" ? "default" : "outline"}
							onClick={() => setStatus("active")}
						>
							Active
						</Button>
						<Button
							size="sm"
							variant={status === "inactive" ? "default" : "outline"}
							onClick={() => setStatus("inactive")}
						>
							Inactive
						</Button>
					</div>
				</div>

				<div>
					<div className="text-sm font-medium">Filter (JSON)</div>
					<Textarea
						className="mt-2 min-h-[180px] font-mono text-xs"
						value={filterText}
						onChange={(e) => setFilterText(e.target.value)}
					/>
					{parsedFilter === null ? (
						<p className="text-xs text-destructive mt-2">
							Invalid JSON filter.
						</p>
					) : null}
				</div>

				<div className="flex gap-2">
					<Button
						onClick={() => {
							if (parsedFilter === null) {
								toast({
									variant: "error",
									title: "Fix filter JSON",
								});
								return;
							}

							saveMutation.mutate({
								eventName,
								status,
								filter: parsedFilter,
							});
						}}
						disabled={saveMutation.isPending || parsedFilter === null}
					>
						{saveMutation.isPending ? "Saving..." : "Save Configuration"}
					</Button>

					<Button
						variant="outline"
						onClick={() => runTestMutation.mutate({ eventName })}
						disabled={runTestMutation.isPending}
					>
						{runTestMutation.isPending ? "Starting..." : "Run Test"}
					</Button>

					<Button
						variant="outline"
						onClick={() => runNowMutation.mutate({ eventName })}
						disabled={runNowMutation.isPending}
					>
						{runNowMutation.isPending ? "Starting..." : "Run Now"}
					</Button>
				</div>

				{runId ? (
					<div className="text-xs text-muted-foreground">
						Latest run: {runId}
						{runStatus ? ` (${runStatus})` : ""}
					</div>
				) : null}
			</div>

			<div className="rounded-lg border bg-card p-4">
				{latestMeta ? (
					<div className="grid gap-2 md:grid-cols-4 mb-4">
						<SummaryCard
							label="Found"
							value={latestMeta.found ?? 0}
							sub={`Trigger: ${latestMeta.triggerType || "-"}`}
						/>
						<SummaryCard
							label="Sent"
							value={latestMeta.sent ?? 0}
							sub={`Grouped: ${latestMeta.grouped ?? 0}`}
						/>
						<SummaryCard
							label="Failed"
							value={latestMeta.failed ?? 0}
							sub={`Skipped: ${latestMeta.skipped ?? 0}`}
						/>
						<SummaryCard
							label="Status"
							value={String(latestMeta.statusUsed || "-")}
							sub={latestRun?.createdAt ? formatDate(latestRun.createdAt) : "-"}
						/>
					</div>
				) : null}

				<h3 className="text-sm font-semibold mb-3">Run History</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left border-b">
								<th className="py-2 pr-3">Time</th>
								<th className="py-2 pr-3">Value</th>
								<th className="py-2 pr-3">Trigger</th>
								<th className="py-2">Meta</th>
							</tr>
						</thead>
						<tbody>
							{latestHistory.map((item, index) => {
								const meta = parseTaskHistoryMeta(item.meta);
								return (
									<tr
										key={item.id}
										className={`border-b align-top ${index === 0 ? "bg-muted/30" : ""}`}
									>
										<td className="py-2 pr-3 whitespace-nowrap">
											{formatDate(item.createdAt)}
										</td>
										<td className="py-2 pr-3">{item.value}</td>
										<td className="py-2 pr-3">
											{String(meta?.triggerType || "-")}
										</td>
										<td className="py-2">
											<HistoryMetaView meta={meta} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				{!latestHistory.length ? (
					<p className="text-sm text-muted-foreground mt-2">No history yet.</p>
				) : null}
			</div>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: string | number;
	sub?: string;
}) {
	return (
		<div className="rounded-md border p-3 bg-background">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-lg font-semibold">{value}</div>
			{sub ? (
				<div className="text-xs text-muted-foreground mt-1">{sub}</div>
			) : null}
		</div>
	);
}

function HistoryMetaView({ meta }: { meta: TaskHistoryMeta | null }) {
	if (!meta) {
		return <div className="text-xs text-muted-foreground">No meta</div>;
	}

	const recipients = meta.successfulRecipients || [];
	const skippedSales = meta.skippedSales || [];

	return (
		<div className="text-xs space-y-2">
			<div className="flex flex-wrap gap-2 text-muted-foreground">
				<span>Status: {meta.statusUsed || "-"}</span>
				<span>Found: {meta.found ?? 0}</span>
				<span>Sent: {meta.sent ?? 0}</span>
				<span>Failed: {meta.failed ?? 0}</span>
				<span>Skipped: {meta.skipped ?? 0}</span>
			</div>

			{meta.filterUsed ? (
				<details>
					<summary className="cursor-pointer text-muted-foreground">
						Filter
					</summary>
					<pre className="whitespace-pre-wrap break-words mt-1">
						{JSON.stringify(meta.filterUsed, null, 2)}
					</pre>
				</details>
			) : null}

			{recipients.length ? (
				<div>
					<div className="font-medium">
						Successful Recipients ({recipients.length})
					</div>
					<div className="space-y-1 mt-1">
						{recipients.slice(0, 3).map((recipient) => (
							<div key={`${recipient.recipientRole}-${recipient.recipientId}`}>
								{recipient.recipientName} ({recipient.recipientRole}) -{" "}
								{recipient.salesCount} sale(s)
							</div>
						))}
						{meta.successfulRecipientsTruncated ? (
							<div className="text-muted-foreground">
								+{meta.successfulRecipientsTruncated} more omitted
							</div>
						) : null}
					</div>
				</div>
			) : null}

			{skippedSales.length ? (
				<div>
					<div className="font-medium">
						Skipped Sales ({skippedSales.length})
					</div>
					<div className="space-y-1 mt-1">
						{skippedSales.slice(0, 3).map((sale) => (
							<div key={sale.saleId}>
								{sale.orderId} - {(sale.reasons || []).join(", ")}
							</div>
						))}
						{meta.skippedSalesTruncated ? (
							<div className="text-muted-foreground">
								+{meta.skippedSalesTruncated} more omitted
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

function parseTaskHistoryMeta(value: unknown): TaskHistoryMeta | null {
	if (!value || typeof value !== "object") return null;
	return value as TaskHistoryMeta;
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}
