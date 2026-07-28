"use client";

import { TaskEventHistoryColumnVisibility } from "@/components/tables-2/task-event-history/column-visibility";
import { DataTable as TaskEventHistoryTable } from "@/components/tables-2/task-event-history/data-table";
import { useAuth } from "@/hooks/use-auth";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
	eventName: string;
	initialHistorySettings?: Partial<TableSettings>;
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
	reportDate?: string;
	totalPaymentsReceived?: number;
	totalRefunds?: number;
	netReceived?: number;
	paymentCount?: number;
	exceptionCount?: number;
	recipientCount?: number;
	notificationChannelName?: string;
	artifact?: {
		documentId?: string;
		filename?: string;
		pathname?: string;
		url?: string | null;
		contentType?: string;
		size?: number | null;
	};
	methodTotals?: Array<{
		paymentMethod: string;
		count: number;
		grossReceived: number;
		refunds: number;
		netReceived: number;
	}>;
};

export function TaskEventDetail({ eventName, initialHistorySettings }: Props) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const taskEventsListQueryKey = useMemo(
		() => trpc.taskEvents.list.queryKey(),
		[trpc],
	);
	const [status, setStatus] = useState<"active" | "inactive">("active");
	const [filter, setFilter] = useState<Record<string, unknown>>({});
	const [filterText, setFilterText] = useState("{}");
	const [runId, setRunId] = useState<string | null>(null);
	const [syncedRunId, setSyncedRunId] = useState<string | null>(null);
	const [manualDateMode, setManualDateMode] = useState<"single" | "range">(
		"single",
	);
	const [manualSingleDate, setManualSingleDate] = useState(() =>
		formatDateInputValue(new Date()),
	);
	const [manualRangeFrom, setManualRangeFrom] = useState(() =>
		formatDateInputValue(new Date()),
	);
	const [manualRangeTo, setManualRangeTo] = useState(() =>
		formatDateInputValue(new Date()),
	);

	const { data, isPending, refetch } = useQuery(
		trpc.taskEvents.get.queryOptions({ eventName }),
	);

	const historyQuery = useQuery(
		trpc.taskEvents.history.queryOptions({ eventName }),
	);
	const refetchHistory = historyQuery.refetch;

	const runStatusQuery = useQuery(
		trpc.taskEvents.runStatus.queryOptions(
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
		setFilter((data.config.filter || {}) as Record<string, unknown>);
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
					queryKey: taskEventsListQueryKey,
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
		taskEventsListQueryKey,
	]);

	const saveMutation = useMutation(
		trpc.taskEvents.update.mutationOptions({
			onSuccess: async () => {
				toast({
					variant: "success",
					title: "Task event updated",
				});
				await Promise.all([
					refetch(),
					historyQuery.refetch(),
					queryClient.invalidateQueries({
						queryKey: taskEventsListQueryKey,
					}),
				]);
			},
		}),
	);

	const runNowMutation = useMutation(
		trpc.taskEvents.runNow.mutationOptions({
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
		trpc.taskEvents.runTest.mutationOptions({
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
	const isPaymentsReport = eventName === "sales-daily-payment-report-schedule";

	const parsedFilter = useMemo(() => {
		try {
			return JSON.parse(filterText || "{}");
		} catch {
			return null;
		}
	}, [filterText]);
	const filterSystem = data?.filterSystem;
	const usesSalesFilterSystem =
		filterSystem?.systemId === "sales-order-search-filter" &&
		filterSystem?.paramsSchemaId === "use-sales-filter-params";
	const saveFilter = usesSalesFilterSystem ? filter : parsedFilter;
	const hasInvalidFilter = !usesSalesFilterSystem && parsedFilter === null;
	const paymentFilter =
		isPaymentsReport && saveFilter && typeof saveFilter === "object"
			? (saveFilter as Record<string, unknown>)
			: {};
	const manualDateFrom =
		manualDateMode === "single" ? manualSingleDate : manualRangeFrom;
	const manualDateTo =
		manualDateMode === "single" ? manualSingleDate : manualRangeTo;
	const hasInvalidManualDateRange =
		manualDateMode === "range" &&
		Boolean(manualDateFrom && manualDateTo && manualDateTo < manualDateFrom);
	const hasMissingManualDate =
		!manualDateFrom || !manualDateTo || hasInvalidManualDateRange;
	const manualRunFilter = {
		...paymentFilter,
		dateFrom: manualDateFrom,
		dateTo: manualDateTo,
	};

	const setSystemFilters = (next: Record<string, unknown> | null) => {
		setFilter((current) => {
			if (!next) return {};

			const merged: Record<string, unknown> = {
				...current,
				...next,
			};

			for (const [key, value] of Object.entries(merged)) {
				const emptyArray = Array.isArray(value) && value.length === 0;
				if (
					value === null ||
					value === undefined ||
					value === "" ||
					emptyArray
				) {
					delete merged[key];
				}
			}

			return merged;
		});
	};

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
					<div className="text-sm font-medium">Filter</div>
					{usesSalesFilterSystem ? (
						<div className="mt-2 flex flex-col gap-2">
							<SearchFilter
								filterSchema={salesFilterParamsSchema}
								placeholder="Search Order Information..."
								trpcRoute={trpc.filters.salesOrders}
								trpQueryOptions={{
									salesManager: auth?.can?.viewSalesManager,
								}}
								initialFilterList={[]}
								filters={filter}
								setFilters={setSystemFilters}
							/>
							<div className="text-xs text-muted-foreground">
								System: {filterSystem?.paramsSchemaId} /{" "}
								{filterSystem?.systemId}
							</div>
							{filterSystem?.definitions?.length ? (
								<div className="text-xs text-muted-foreground">
									Allowed keys:{" "}
									{filterSystem.definitions.map((item) => item.key).join(", ")}
								</div>
							) : null}
							<pre className="rounded border bg-muted/30 p-2 text-xs overflow-auto">
								{JSON.stringify(filter, null, 2)}
							</pre>
						</div>
					) : (
						<div className="mt-2">
							<Textarea
								className="min-h-[180px] font-mono text-xs"
								value={filterText}
								onChange={(e) => setFilterText(e.target.value)}
							/>
							{parsedFilter === null ? (
								<p className="text-xs text-destructive mt-2">
									Invalid JSON filter.
								</p>
							) : null}
						</div>
					)}
				</div>

				<div className="flex gap-2">
					<Button
						onClick={() => {
							if (saveFilter === null) {
								toast({
									variant: "error",
									title: "Fix filter",
								});
								return;
							}

							saveMutation.mutate({
								eventName,
								status,
								filter: saveFilter,
							});
						}}
						disabled={saveMutation.isPending || hasInvalidFilter}
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

			{isPaymentsReport ? (
				<div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
					<div>
						<div className="text-sm font-medium">Manual Report Run</div>
						<p className="text-xs text-muted-foreground mt-1">
							Run this report for a one-off payment date or date range without
							changing the daily schedule.
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant={manualDateMode === "single" ? "default" : "outline"}
							onClick={() => setManualDateMode("single")}
						>
							Single date
						</Button>
						<Button
							type="button"
							size="sm"
							variant={manualDateMode === "range" ? "default" : "outline"}
							onClick={() => setManualDateMode("range")}
						>
							Date range
						</Button>
					</div>

					{manualDateMode === "single" ? (
						<div className="grid gap-2 md:max-w-xs">
							<label
								htmlFor="manual-single-payment-date"
								className="text-xs font-medium text-muted-foreground"
							>
								Payment date
							</label>
							<Input
								id="manual-single-payment-date"
								type="date"
								value={manualSingleDate}
								onChange={(event) => setManualSingleDate(event.target.value)}
							/>
						</div>
					) : (
						<div className="grid gap-3 md:grid-cols-2 md:max-w-xl">
							<div className="grid gap-2">
								<label
									htmlFor="manual-payment-date-from"
									className="text-xs font-medium text-muted-foreground"
								>
									From
								</label>
								<Input
									id="manual-payment-date-from"
									type="date"
									value={manualRangeFrom}
									onChange={(event) => setManualRangeFrom(event.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<label
									htmlFor="manual-payment-date-to"
									className="text-xs font-medium text-muted-foreground"
								>
									To
								</label>
								<Input
									id="manual-payment-date-to"
									type="date"
									value={manualRangeTo}
									onChange={(event) => setManualRangeTo(event.target.value)}
								/>
							</div>
						</div>
					)}

					{hasInvalidManualDateRange ? (
						<p className="text-xs text-destructive">
							End date cannot be before start date.
						</p>
					) : null}

					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							onClick={() => {
								if (hasMissingManualDate) {
									toast({
										variant: "error",
										title: "Select a valid report date",
									});
									return;
								}

								runNowMutation.mutate({
									eventName,
									filter: manualRunFilter,
								});
							}}
							disabled={runNowMutation.isPending || hasMissingManualDate}
						>
							{runNowMutation.isPending ? "Starting..." : "Run Report"}
						</Button>
						<div className="text-xs text-muted-foreground">
							Timezone: {String(paymentFilter.timezone || "America/New_York")}
						</div>
					</div>
				</div>
			) : null}

			<div className="rounded-lg border bg-card p-4">
				{latestMeta ? (
					<div className="grid gap-2 md:grid-cols-4 mb-4">
						{isPaymentsReport ? (
							<>
								<SummaryCard
									label="Net Received"
									value={formatCurrency(latestMeta.netReceived ?? 0)}
									sub={`Report: ${latestMeta.reportDate || "-"}`}
								/>
								<SummaryCard
									label="Payments"
									value={latestMeta.paymentCount ?? 0}
									sub={`Exceptions: ${latestMeta.exceptionCount ?? 0}`}
								/>
								<SummaryCard
									label="Email"
									value={latestMeta.sent ?? 0}
									sub={`Recipients: ${latestMeta.recipientCount ?? 0}`}
								/>
							</>
						) : (
							<>
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
							</>
						)}
						<SummaryCard
							label="Status"
							value={String(latestMeta.statusUsed || "-")}
							sub={latestRun?.createdAt ? formatDate(latestRun.createdAt) : "-"}
						/>
					</div>
				) : null}

				<div className="mb-3 flex items-center justify-between gap-3">
					<h3 className="text-sm font-semibold">Run History</h3>
					<TaskEventHistoryColumnVisibility />
				</div>
				<TaskEventHistoryTable
					data={latestHistory}
					initialSettings={initialHistorySettings}
					isLoading={historyQuery.isPending}
					formatDate={formatDate}
					renderMeta={(value) => (
						<HistoryMetaView meta={parseTaskHistoryMeta(value)} />
					)}
				/>
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
	const artifactUrl = meta.artifact?.url || meta.artifact?.pathname || null;

	return (
		<div className="space-y-1 text-xs leading-5">
			<div className="flex max-h-10 flex-wrap gap-x-2 gap-y-0.5 overflow-hidden text-muted-foreground">
				<span>Status: {meta.statusUsed || "-"}</span>
				{meta.reportDate ? <span>Report: {meta.reportDate}</span> : null}
				{meta.netReceived != null ? (
					<span>Net: {formatCurrency(meta.netReceived)}</span>
				) : null}
				{meta.paymentCount != null ? (
					<span>Payments: {meta.paymentCount}</span>
				) : null}
				{meta.found != null ? <span>Found: {meta.found}</span> : null}
				<span>Sent: {meta.sent ?? 0}</span>
				<span>Failed: {meta.failed ?? 0}</span>
				<span>Skipped: {meta.skipped ?? 0}</span>
			</div>

			{artifactUrl ? (
				<div>
					<a
						href={artifactUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
					>
						Download {meta.artifact?.filename || "Excel report"}
					</a>
				</div>
			) : null}

			{meta.methodTotals?.length ? (
				<div>
					<div className="font-medium">Payment Methods</div>
					<div className="mt-0.5 flex max-h-10 flex-wrap gap-x-2 gap-y-0.5 overflow-hidden text-muted-foreground">
						{meta.methodTotals.map((row) => (
							<span key={row.paymentMethod}>
								{row.paymentMethod}: {formatCurrency(row.netReceived)} (
								{row.count})
							</span>
						))}
					</div>
				</div>
			) : null}

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
					<div className="mt-0.5 max-h-10 space-y-0.5 overflow-hidden">
						{recipients.slice(0, 2).map((recipient) => (
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
					<div className="mt-0.5 max-h-10 space-y-0.5 overflow-hidden">
						{skippedSales.slice(0, 2).map((sale) => (
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

function formatDateInputValue(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value) || 0);
}
