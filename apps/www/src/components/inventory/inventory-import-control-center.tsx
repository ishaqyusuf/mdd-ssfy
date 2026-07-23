"use client";

import ConfirmBtn from "@/components/confirm-button";
import { InventoryImportProjectionHistory } from "@/components/inventory/inventory-import-projection-history";
import { InventoryImportRunHistory } from "@/components/inventory/inventory-import-run-history";
import { InventoryImportSourceBatchDisposition } from "@/components/inventory/inventory-import-source-batch-disposition";
import { InventoryImportSourceDisposition } from "@/components/inventory/inventory-import-source-disposition";
import { InventoryImportColumnVisibility } from "@/components/tables-2/inventory-import/column-visibility";
import type { InventoryImportRow } from "@/components/tables-2/inventory-import/columns";
import { DataTable } from "@/components/tables-2/inventory-import/data-table";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useInventoryImportFilterParams } from "@/hooks/use-inventory-import-filter-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Strategy = "optimized" | "handcrafted";
type ScopeMode = "active" | "all";
type RunFullImportInput = {
	categoryId?: number;
	scope?: ScopeMode;
	strategy?: Strategy;
	compare?: boolean;
	reset?: boolean;
	source?: "event" | "job" | "manual";
};

type Props = {
	initialScope?: ScopeMode;
	initialTableSettings?: Partial<TableSettings>;
};

type InventoryImportSourceReview =
	RouterOutputs["inventories"]["inventoryImportSourceReview"];
type InventoryImportCategoryCleanupReview =
	RouterOutputs["inventories"]["inventoryImportCategoryCleanupReview"];

function StatCard({
	title,
	value,
	subtitle,
}: {
	title: string;
	value: string | number;
	subtitle: string;
}) {
	return (
		<Card className="p-4">
			<div className="text-xs uppercase tracking-wide text-muted-foreground">
				{title}
			</div>
			<div className="mt-2 text-2xl font-semibold">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
		</Card>
	);
}

function CheckRow({
	label,
	ok,
	detail,
	pending,
}: {
	label: string;
	ok: boolean;
	detail: string;
	pending?: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-lg border p-3">
			<div className="space-y-1">
				<div className="font-medium">{label}</div>
				<div className="text-sm text-muted-foreground">{detail}</div>
			</div>
			<Badge
				variant={pending ? "outline" : ok ? "secondary" : "destructive"}
				className="shrink-0 gap-1"
			>
				{pending ? (
					<Icons.Clock className="size-3.5" />
				) : ok ? (
					<Icons.CheckCircle className="size-3.5" />
				) : (
					<Icons.Clock className="size-3.5" />
				)}
				{pending ? "Checking" : ok ? "Healthy" : "Needs Attention"}
			</Badge>
		</div>
	);
}

export function InventoryImportControlCenter({
	initialScope = "active",
	initialTableSettings,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [strategy, setStrategy] = useState<Strategy>("optimized");
	const [scope, setScope] = useState<ScopeMode>(initialScope);
	const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);
	const [currentRunId, setCurrentRunId] = useState<string | null>(null);
	const [currentRunLabel, setCurrentRunLabel] = useState<string | null>(null);
	const [currentRunHasImportDiagnostic, setCurrentRunHasImportDiagnostic] =
		useState(false);
	const idleQueryEnabled = useIdleQueryEnabled(1000);
	const { filters, hasFilters, setFilters } = useInventoryImportFilterParams();

	const imports = useSuspenseQuery(
		trpc.inventories.inventoryImports.queryOptions({
			size: 200,
			scope,
			q: filters.q,
		}),
	);
	const totalProducts = useQuery(
		trpc.inventories.inventorySummary.queryOptions(
			{
				type: "total_products",
			},
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const categories = useQuery(
		trpc.inventories.inventorySummary.queryOptions(
			{
				type: "categories",
			},
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const kindReview = useQuery(
		trpc.inventories.inventoryProductKindReview.queryOptions(undefined, {
			enabled: idleQueryEnabled,
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const sourceReview = useQuery(
		trpc.inventories.inventoryImportSourceReview.queryOptions(
			{ limit: 100 },
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const categoryCleanupReview = useQuery(
		trpc.inventories.inventoryImportCategoryCleanupReview.queryOptions(
			{ limit: 50 },
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const projectionHistory = useQuery(
		trpc.inventories.inventoryImportProjectionHistory.queryOptions(
			{ limit: 8 },
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 15 * 1000,
			},
		),
	);
	const salesInventorySyncMonitor = useQuery(
		trpc.inventories.salesInventorySyncMonitor.queryOptions(
			{
				sampleLimit: 5,
				includeReconciliation: true,
				reconciliationLimit: 50,
			},
			{
				enabled: idleQueryEnabled,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const runStatus = useQuery({
		...trpc.taskTrigger.status.queryOptions({
			runId: currentRunId || "pending",
		}),
		enabled: !!currentRunId,
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			return status &&
				["COMPLETED", "FAILED", "CANCELED", "CANCELLED"].includes(status)
				? false
				: 1500;
		},
	});

	const rows = (imports.data?.data || []) as InventoryImportRow[];
	const scopeMeta = imports.data?.meta;
	const importedCount = rows.filter((row) => Boolean(row.categoryUid)).length;
	const pendingCount = rows.filter((row) => !row.categoryUid).length;
	const totalScopedProducts = rows.reduce(
		(sum, row) => sum + Number(row.totalProducts || 0),
		0,
	);
	const totalStandardProducts = rows.reduce(
		(sum, row) => sum + Number(row.standardProducts || 0),
		0,
	);
	const totalCustomProducts = rows.reduce(
		(sum, row) => sum + Number(row.customProducts || 0),
		0,
	);
	const sourceReviewData = sourceReview.data as
		| InventoryImportSourceReview
		| undefined;
	const categoryCleanupData = categoryCleanupReview.data as
		| InventoryImportCategoryCleanupReview
		| undefined;

	const invalidateAll = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryImports.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryProducts.infiniteQueryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventorySummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryProductKindReview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryImportSourceReview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey:
					trpc.inventories.inventoryImportCategoryCleanupReview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryImportRunHistory.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inventoryImportProjectionHistory.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesInventorySyncMonitor.queryKey(),
			}),
		]);
	}, [queryClient, trpc]);

	const finalizeImportRun = useMutation(
		trpc.taskRunDiagnostics.finalize.mutationOptions({
			onSettled: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.inventoryImportRunHistory.queryKey(),
				});
			},
		}),
	);
	const runFullImport = useMutation(
		trpc.inventories.runFullImport.mutationOptions({
			onSuccess: async (data, variables) => {
				const input = (variables ?? {}) as RunFullImportInput;
				setCurrentRunId(data.id);
				setCurrentRunHasImportDiagnostic(data.diagnosticRecorded);
				setCurrentRunLabel(
					input.compare
						? "System Check"
						: input.reset
							? "Full Refresh"
							: "Update Inventory",
				);
				setLastRunSummary(
					`${input.compare ? "System check" : input.reset ? "Full refresh" : "Inventory update"} queued for ${input.scope ?? "active"} scope using ${input.strategy ?? strategy}.${data.diagnosticRecorded ? "" : " Run history could not be persisted; use the live status below for this run."}`,
				);
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.inventoryImportRunHistory.queryKey(),
				});
				toast({
					title: input.compare
						? "System check queued"
						: input.reset
							? "Full refresh queued"
							: "Inventory update queued",
					variant: "success",
				});
			},
			onError: () => {
				toast({
					title: "Import action failed",
					variant: "destructive",
				});
			},
		}),
	);
	const runSalesInventoryBackfill = useMutation(
		trpc.inventories.backfillSalesInventorySync.mutationOptions({
			onSuccess: async (data) => {
				setCurrentRunId(data.id);
				setCurrentRunHasImportDiagnostic(false);
				setCurrentRunLabel("Sales inventory backfill");
				setLastRunSummary(
					"Sales inventory backfill queued for the next unsynced batch.",
				);
				toast({
					title: "Sales inventory backfill queued",
					variant: "success",
				});
			},
			onError: () => {
				toast({
					title: "Sales inventory backfill failed",
					variant: "destructive",
				});
			},
		}),
	);
	const runInventoryReconciliation = useMutation(
		trpc.inventories.runInventoryReconciliationReport.mutationOptions({
			onSuccess: async (data, variables) => {
				setCurrentRunId(data.id);
				setCurrentRunHasImportDiagnostic(false);
				setCurrentRunLabel("Inventory reconciliation");
				const reconciliationInput =
					variables && "cursorId" in variables ? variables : null;
				setLastRunSummary(
					`Inventory reconciliation queued from cursor ${reconciliationInput?.cursorId ?? 0} with a ${reconciliationInput?.limit ?? 50}-line batch.`,
				);
				toast({
					title: "Inventory reconciliation queued",
					variant: "success",
				});
			},
			onError: () => {
				toast({
					title: "Inventory reconciliation failed",
					variant: "destructive",
				});
			},
		}),
	);
	const cleanupStaleSalesInventoryLines = useMutation(
		trpc.inventories.cleanupStaleSalesInventoryLineItems.mutationOptions({
			onSuccess: async (data) => {
				setLastRunSummary(
					`${data.cleanedLineItemCount} stale inventory sale lines cleaned; ${data.releasedAllocationCount} allocations released and ${data.cancelledInboundDemandCount} inbound demand rows cancelled.`,
				);
				toast({
					title: "Stale inventory sale lines cleaned",
					variant: "success",
				});
				await invalidateAll();
			},
			onError: () => {
				toast({
					title: "Stale inventory cleanup failed",
					variant: "destructive",
				});
			},
		}),
	);
	const archiveSourceCandidates = useMutation(
		trpc.inventories.archiveInventoryImportSourceCandidates.mutationOptions({
			onSuccess: async (data) => {
				setLastRunSummary(
					`${data.archivedIds.length} reviewed inventory source row(s) archived; ${data.skipped.length} skipped by the safety policy.`,
				);
				toast({
					title: "Reviewed import rows archived",
					variant: "success",
				});
				await invalidateAll();
			},
			onError: () => {
				toast({
					title: "Import source archive failed",
					variant: "destructive",
				});
			},
		}),
	);
	const applySourceDisposition = useMutation(
		trpc.inventories.applyInventoryImportSourceDisposition.mutationOptions({
			onSuccess: async (data) => {
				if (data.status === "applied") {
					setLastRunSummary(
						`Inventory item ${data.inventoryId} retained in category ${data.targetCategoryId}; audit event ${data.auditEventId} recorded.${data.syncQueued ? "" : " Dyke projection could not be queued and needs retry."}${data.projectionDiagnosticRecorded ? "" : " Projection attempt evidence could not be persisted."}`,
					);
					toast({
						title: "Import item retained and moved",
						variant: "success",
					});
				} else {
					setLastRunSummary(
						`Inventory item ${data.inventoryId} was not changed: ${data.reason.replaceAll("_", " ")}.`,
					);
					toast({
						title: "Import item disposition skipped",
						variant: "destructive",
					});
				}
				await invalidateAll();
			},
			onError: () => {
				toast({
					title: "Import item disposition failed",
					variant: "destructive",
				});
			},
		}),
	);
	const applySourceDispositionBatch = useMutation(
		trpc.inventories.applyInventoryImportSourceDispositionBatch.mutationOptions(
			{
				onSuccess: async (data) => {
					const projectionFailures = data.results.filter(
						(result) => result.status === "applied" && !result.syncQueued,
					).length;
					setLastRunSummary(
						`${data.appliedCount} reviewed inventory row(s) retained and moved; ${data.skippedCount} skipped.${projectionFailures ? ` ${projectionFailures} projection queue failure(s) remain retryable.` : ""}`,
					);
					toast({
						title: "Batch retained disposition complete",
						variant: data.appliedCount ? "success" : "destructive",
					});
					await invalidateAll();
				},
				onError: () => {
					toast({
						title: "Batch retained disposition failed",
						variant: "destructive",
					});
				},
			},
		),
	);
	const cleanupImportCategories = useMutation(
		trpc.inventories.cleanupInventoryImportCategories.mutationOptions({
			onSuccess: async (data) => {
				setLastRunSummary(
					`${data.archivedCategoryIds.length} empty stale import category row(s) archived; ${data.skipped.length} skipped by the live-child safety gate.`,
				);
				toast({
					title: "Reviewed import categories archived",
					variant: "success",
				});
				await invalidateAll();
			},
			onError: () => {
				toast({
					title: "Import category cleanup failed",
					variant: "destructive",
				});
			},
		}),
	);

	const isImportRunning =
		runFullImport.isPending ||
		runSalesInventoryBackfill.isPending ||
		runInventoryReconciliation.isPending ||
		cleanupStaleSalesInventoryLines.isPending ||
		archiveSourceCandidates.isPending ||
		applySourceDisposition.isPending ||
		applySourceDispositionBatch.isPending ||
		cleanupImportCategories.isPending ||
		runStatus.data?.isQueued ||
		runStatus.data?.isExecuting ||
		false;

	useEffect(() => {
		if (!currentRunId || !runStatus.data) return;

		if (runStatus.data.isCompleted) {
			const output = runStatus.data.output as {
				totalSteps?: number;
				strategy?: string;
				compare?: boolean;
				reset?: boolean;
				status?: string;
				checkedLineCount?: number;
				totalDriftCount?: number;
				skippedComparisonCount?: number;
				nextCursorId?: number | null;
				hasMore?: boolean;
			} | null;
			const summary =
				output && typeof output === "object"
					? typeof output.checkedLineCount === "number"
						? `${output.checkedLineCount} inventory lines checked (${String(output.status || "unknown").replace(/_/g, " ")}) with ${output.totalDriftCount || 0} drift row(s)${output.skippedComparisonCount ? ` and ${output.skippedComparisonCount} skipped comparison row(s)` : ""}${output.hasMore ? `; next cursor ${output.nextCursorId ?? "none"}` : ""}.`
						: `${output.totalSteps || 0} steps processed using ${output.strategy || strategy}${output.compare ? " (compare)" : ""}${output.reset ? " with reset" : ""}.`
					: `${currentRunLabel || "Inventory import"} completed.`;

			setLastRunSummary(summary);
			toast({
				title: `${currentRunLabel || "Inventory import"} completed`,
				variant: "success",
			});
			if (currentRunHasImportDiagnostic) {
				finalizeImportRun.mutate({
					runId: currentRunId,
					observedStatus: "COMPLETED",
					metadata: { type: "inventory-import" },
				});
			}
			void invalidateAll();
			setCurrentRunId(null);
			setCurrentRunLabel(null);
			setCurrentRunHasImportDiagnostic(false);
			return;
		}

		if (runStatus.data.isFailed || runStatus.data.isCancelled) {
			setLastRunSummary(
				`${currentRunLabel || "Inventory import"} failed. Review the latest job run for details.`,
			);
			toast({
				title: `${currentRunLabel || "Inventory import"} failed`,
				variant: "destructive",
			});
			if (currentRunHasImportDiagnostic) {
				finalizeImportRun.mutate({
					runId: currentRunId,
					observedStatus: runStatus.data.isCancelled ? "CANCELED" : "FAILED",
					metadata: { type: "inventory-import" },
				});
			}
			setCurrentRunId(null);
			setCurrentRunLabel(null);
			setCurrentRunHasImportDiagnostic(false);
		}
	}, [
		currentRunHasImportDiagnostic,
		currentRunId,
		currentRunLabel,
		finalizeImportRun,
		invalidateAll,
		runStatus.data,
		strategy,
	]);

	const resetInventory = useMutation(
		trpc.inventories.resetInventorySystem.mutationOptions({
			onSuccess: async () => {
				setLastRunSummary("Inventory system reset completed.");
				toast({
					title: "Inventory system reset",
					variant: "success",
				});
				await invalidateAll();
			},
			onError: () => {
				toast({
					title: "Reset failed",
					variant: "destructive",
				});
			},
		}),
	);

	const salesInventoryMonitor = salesInventorySyncMonitor.data;
	const reconciliation = salesInventoryMonitor?.reconciliation ?? null;
	const reconciliationDriftDomains = reconciliation?.driftDomains || [];
	const reconciliationDomainSummaries = reconciliation?.domainSummaries || [];
	const reconciliationSkippedCount =
		reconciliation?.skippedComparisonCount || 0;
	const reviewSamples = salesInventoryMonitor?.reviewSamples || [];
	const staleSamples = salesInventoryMonitor?.staleSamples || [];

	const checks = useMemo(
		() => [
			{
				label: "Legacy import coverage",
				ok: pendingCount === 0,
				detail:
					pendingCount === 0
						? "Every active sales-settings step in scope has an imported inventory category."
						: `${pendingCount} active-scope steps are still pending import coverage.`,
			},
			{
				label: "Stale imported categories",
				ok: (scopeMeta?.staleImportedCategories || 0) === 0,
				detail:
					(scopeMeta?.staleImportedCategories || 0) === 0
						? "No excluded Dyke steps are still represented in imported inventory categories."
						: `${scopeMeta?.staleImportedCategories || 0} imported categories belong to steps outside the active sales-settings scope.`,
			},
			{
				label: "Custom import spillover",
				ok: (scopeMeta?.staleCustomImported || 0) === 0,
				detail:
					(scopeMeta?.staleCustomImported || 0) === 0
						? "No excluded custom imports are still attached to stale steps."
						: `${scopeMeta?.staleCustomImported || 0} custom imported rows are still linked to steps outside the active scope.`,
			},
			{
				label: "Kind classification review",
				pending: !idleQueryEnabled || kindReview.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!kindReview.isPending &&
					(kindReview.data?.summary?.mismatched || 0) === 0,
				detail:
					!idleQueryEnabled || kindReview.isPending
						? "Classification review will load after the import table is ready."
						: (kindReview.data?.summary?.mismatched || 0) === 0
							? "Current inventory/component kinds match the pricing heuristic."
							: `${kindReview.data?.summary?.mismatched || 0} records still differ from the suggested kind.`,
			},
			{
				label: "Import source review",
				pending: !idleQueryEnabled || sourceReview.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!sourceReview.isPending &&
					(sourceReviewData?.meta.protected || 0) === 0 &&
					(sourceReviewData?.meta.customReview || 0) === 0 &&
					(sourceReviewData?.meta.archiveCandidates || 0) === 0,
				detail:
					!idleQueryEnabled || sourceReview.isPending
						? "Source safety review will load after the import table is ready."
						: sourceReviewData?.meta.returned
							? `${String(sourceReviewData.meta.archiveCandidates)} archive candidate(s), ${String(sourceReviewData.meta.customReview)} custom review row(s), and ${String(sourceReviewData.meta.protected)} protected row(s) need explicit handling.`
							: "No stale or orphaned imported inventory source labels were found.",
			},
			{
				label: "Retained-item projection queue",
				pending: !idleQueryEnabled || projectionHistory.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!projectionHistory.isPending &&
					(projectionHistory.data?.meta.retryable || 0) === 0,
				detail:
					!idleQueryEnabled || projectionHistory.isPending
						? "Projection attempt evidence will load after the import table is ready."
						: projectionHistory.data?.meta.retryable
							? `${projectionHistory.data.meta.retryable} retained-item projection attempt(s) need retry; ${projectionHistory.data.meta.queued} are queued.`
							: `${projectionHistory.data?.meta.queued || 0} retained-item projection attempt(s) are queued and none need retry.`,
			},
			{
				label: "Category cleanup readiness",
				pending: !idleQueryEnabled || categoryCleanupReview.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!categoryCleanupReview.isPending &&
					(categoryCleanupData?.meta.staleCategoryCount || 0) === 0,
				detail:
					!idleQueryEnabled || categoryCleanupReview.isPending
						? "Category cleanup safety will load after the import table is ready."
						: (categoryCleanupData?.meta.staleCategoryCount || 0) === 0
							? "No active inventory categories remain outside the sales-settings route graph."
							: `${categoryCleanupData?.meta.ready || 0} empty stale category row(s) are ready to archive; ${categoryCleanupData?.meta.blocked || 0} remain blocked by live inventory rows.`,
			},
			{
				label: "Import strategy",
				ok: strategy === "optimized",
				detail:
					strategy === "optimized"
						? "Optimized strategy is selected as the default update path."
						: "Handcrafted strategy is selected for this run. Use only when validating edge cases.",
			},
			{
				label: "Sales inventory sync coverage",
				pending: !idleQueryEnabled || salesInventorySyncMonitor.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!salesInventorySyncMonitor.isPending &&
					salesInventorySyncMonitor.data?.status === "synced",
				detail:
					!idleQueryEnabled || salesInventorySyncMonitor.isPending
						? "Sales inventory sync monitor will load after the control center is ready."
						: salesInventorySyncMonitor.data?.status === "synced"
							? "Every legacy sale has inventory-backed line items."
							: reconciliation?.status === "partial"
								? `${reconciliation?.checkedLineCount ?? 0} reconciled inventory lines checked clean so far; continue from cursor ${reconciliation?.nextCursorId ?? "none"} before cutover.`
								: reconciliationSkippedCount > 0
									? `${reconciliationSkippedCount} reconciliation comparison row(s) were skipped; review coverage before treating sales sync as cutover-ready.`
									: `${salesInventorySyncMonitor.data?.missingSalesCount || 0} sales still need backfill and ${salesInventorySyncMonitor.data?.failedRiskCount || 0} synced sales need review.`,
			},
			{
				label: "Inventory reconciliation",
				pending: !idleQueryEnabled || salesInventorySyncMonitor.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!salesInventorySyncMonitor.isPending &&
					reconciliation?.status === "synced",
				detail:
					!idleQueryEnabled || salesInventorySyncMonitor.isPending
						? "Inventory reconciliation summary will load after the sales sync monitor is ready."
						: !reconciliation
							? "Inventory reconciliation summary is unavailable for this monitor run."
							: reconciliation.totalDriftCount > 0
								? `${reconciliation.totalDriftCount} reconciliation drift rows need review across ${reconciliation.driftDomains.length} domain(s).`
								: reconciliationSkippedCount > 0
									? `${reconciliationSkippedCount} reconciliation comparison row(s) were skipped; review the coverage cards before cutover.`
									: reconciliation.hasMore
										? `${reconciliation.checkedLineCount} inventory lines checked clean; continue from cursor ${reconciliation.nextCursorId} for full coverage.`
										: `${reconciliation.checkedLineCount} inventory lines checked with no reconciliation drift.`,
			},
			{
				label: "Stale fulfillment residue",
				pending: !idleQueryEnabled || salesInventorySyncMonitor.isPending,
				ok:
					Boolean(idleQueryEnabled) &&
					!salesInventorySyncMonitor.isPending &&
					(salesInventorySyncMonitor.data?.staleStockAllocationCount || 0) ===
						0 &&
					(salesInventorySyncMonitor.data?.staleInboundDemandCount || 0) === 0,
				detail:
					!idleQueryEnabled || salesInventorySyncMonitor.isPending
						? "Stale allocation and demand residue will load after the sales sync monitor is ready."
						: (salesInventorySyncMonitor.data?.staleStockAllocationCount ||
									0) === 0 &&
								(salesInventorySyncMonitor.data?.staleInboundDemandCount ||
									0) === 0
							? "No active allocation or inbound demand rows are attached to stale inventory sale lines."
							: `${salesInventorySyncMonitor.data?.staleStockAllocationCount || 0} allocation rows and ${salesInventorySyncMonitor.data?.staleInboundDemandCount || 0} inbound demand rows are attached to stale inventory sale lines.`,
			},
		],
		[
			idleQueryEnabled,
			kindReview.isPending,
			kindReview.data?.summary?.mismatched,
			categoryCleanupData?.meta.blocked,
			categoryCleanupData?.meta.ready,
			categoryCleanupData?.meta.staleCategoryCount,
			categoryCleanupReview.isPending,
			projectionHistory.data?.meta.queued,
			projectionHistory.data?.meta.retryable,
			projectionHistory.isPending,
			sourceReview.isPending,
			sourceReviewData?.meta.archiveCandidates,
			sourceReviewData?.meta.customReview,
			sourceReviewData?.meta.protected,
			sourceReviewData?.meta.returned,
			pendingCount,
			reconciliationSkippedCount,
			salesInventorySyncMonitor.data?.failedRiskCount,
			salesInventorySyncMonitor.data?.missingSalesCount,
			reconciliation,
			salesInventorySyncMonitor.data?.status,
			salesInventorySyncMonitor.data?.staleInboundDemandCount,
			salesInventorySyncMonitor.data?.staleStockAllocationCount,
			salesInventorySyncMonitor.isPending,
			scopeMeta?.staleCustomImported,
			scopeMeta?.staleImportedCategories,
			strategy,
		],
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">Import Control Center</h2>
				<p className="max-w-3xl text-sm text-muted-foreground">
					This workspace is now settings-driven. Update, check, reset, and
					monitor the inventory import from the steps actively used by the sales
					form instead of pulling the full legacy Dyke set.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Scoped Steps"
					value={rows.length}
					subtitle={`${importedCount} imported • ${pendingCount} pending • ${scopeMeta?.excludedSteps || 0} excluded`}
				/>
				<StatCard
					title="Scoped Products"
					value={totalScopedProducts}
					subtitle={`${totalStandardProducts} standard • ${totalCustomProducts} custom in the selected scope`}
				/>
				<StatCard
					title="Imported Labels"
					value={scopeMeta?.importedStandardProducts || 0}
					subtitle={`${scopeMeta?.importedCustomProducts || 0} custom imports labeled separately`}
				/>
				<StatCard
					title="Inventory Records"
					value={
						!idleQueryEnabled || totalProducts.isPending
							? "..."
							: totalProducts.data?.value || 0
					}
					subtitle={String(
						!idleQueryEnabled || totalProducts.isPending
							? "Loading current inventory count"
							: totalProducts.data?.subtitle || "Current inventory count",
					)}
				/>
				<StatCard
					title="Sales Sync"
					value={
						!idleQueryEnabled || salesInventorySyncMonitor.isPending
							? "..."
							: `${salesInventorySyncMonitor.data?.syncCoverageRate || 0}%`
					}
					subtitle={
						!idleQueryEnabled || salesInventorySyncMonitor.isPending
							? "Loading sales inventory coverage"
							: `${salesInventorySyncMonitor.data?.syncedSalesCount || 0}/${salesInventorySyncMonitor.data?.totalSalesCount || 0} synced • ${salesInventorySyncMonitor.data?.missingSalesCount || 0} missing`
					}
				/>
				<StatCard
					title="Categories"
					value={
						!idleQueryEnabled || categories.isPending
							? "..."
							: categories.data?.value || 0
					}
					subtitle={
						!idleQueryEnabled || categories.isPending
							? "Loading active category count"
							: "Active inventory categories"
					}
				/>
			</div>

			{sourceReviewData?.candidates.length ? (
				<Card className="p-5">
					<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
						<div className="space-y-1">
							<h3 className="font-semibold">Imported Source Review</h3>
							<p className="max-w-3xl text-sm text-muted-foreground">
								Read-only safety evidence for imported rows outside the active
								sales-settings scope. Standard rows can be archived only after
								review; custom rows always stay an explicit exception.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">
								{sourceReviewData.meta.archiveCandidates} archive candidates
							</Badge>
							<Badge variant="outline">
								{sourceReviewData.meta.protected} protected
							</Badge>
							<Badge variant="outline">
								{sourceReviewData.meta.customReview} custom review
							</Badge>
							{sourceReviewData.meta.archiveCandidates ? (
								<ConfirmBtn
									variant="outline"
									icon="Warn"
									isDeleting={archiveSourceCandidates.isPending}
									disabled={isImportRunning}
									onClick={async () => {
										archiveSourceCandidates.mutate({
											inventoryIds: sourceReviewData.candidates
												.filter(
													(candidate) =>
														candidate.status === "archive_candidate",
												)
												.map((candidate) => candidate.inventoryId),
											apply: true,
										});
									}}
								>
									Archive safe standard rows
								</ConfirmBtn>
							) : null}
						</div>
					</div>
					<InventoryImportSourceBatchDisposition
						candidates={sourceReviewData.candidates}
						targetCategories={categoryCleanupData?.targetCategories ?? []}
						isPending={applySourceDispositionBatch.isPending}
						onApply={(input) => applySourceDispositionBatch.mutate(input)}
					/>
					<div className="mt-4 grid gap-2 lg:grid-cols-2">
						{sourceReviewData.candidates.slice(0, 12).map((candidate) => (
							<div
								key={candidate.inventoryId}
								className="rounded-md border bg-muted/20 p-3 text-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate font-medium">
											{candidate.inventoryName}
										</div>
										<div className="text-xs text-muted-foreground">
											{candidate.categoryTitle} ·{" "}
											{candidate.sourceStepUid || "missing step"} ·{" "}
											{candidate.sourceCustom ? "custom" : "standard"}
										</div>
									</div>
									<Badge
										variant={
											candidate.status === "protected"
												? "destructive"
												: candidate.status === "custom_review"
													? "outline"
													: "secondary"
										}
										className="shrink-0"
									>
										{candidate.status.replaceAll("_", " ")}
									</Badge>
								</div>
								<div className="mt-2 text-xs text-muted-foreground">
									{candidate.reason.replaceAll("_", " ")}
									{candidate.protectedReasons.length
										? ` · protected by ${candidate.protectedReasons.join(", ")}`
										: ""}
								</div>
								<div className="mt-2">
									<Link
										className="text-xs font-medium text-primary underline-offset-4 hover:underline"
										href={`/inventory/${candidate.inventoryId}`}
									>
										Open inventory item
									</Link>
								</div>
								<InventoryImportSourceDisposition
									candidate={candidate}
									targetCategories={categoryCleanupData?.targetCategories ?? []}
									isPending={applySourceDisposition.isPending}
									onApply={(input) => applySourceDisposition.mutate(input)}
								/>
							</div>
						))}
					</div>
					{sourceReviewData.candidates.length > 12 ? (
						<div className="mt-3 text-xs text-muted-foreground">
							Showing 12 of {sourceReviewData.candidates.length} returned
							candidates. The query is bounded to 100 rows.
						</div>
					) : null}
				</Card>
			) : null}

			{categoryCleanupData?.candidates.length ? (
				<Card className="p-5">
					<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
						<div className="space-y-1">
							<h3 className="font-semibold">Stale Category Cleanup Gate</h3>
							<p className="max-w-3xl text-sm text-muted-foreground">
								A category can be archived only after every child inventory row
								has been moved, archived, or otherwise dispositioned. Apply
								rechecks the active route graph and live children in the write
								transaction.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">
								{categoryCleanupData.meta.ready} ready
							</Badge>
							<Badge variant="outline">
								{categoryCleanupData.meta.blocked} blocked
							</Badge>
							{categoryCleanupData.meta.ready ? (
								<ConfirmBtn
									variant="outline"
									icon="Warn"
									isDeleting={cleanupImportCategories.isPending}
									disabled={isImportRunning}
									onClick={async () => {
										cleanupImportCategories.mutate({
											categoryIds: categoryCleanupData.candidates
												.filter((candidate) => candidate.status === "ready")
												.map((candidate) => candidate.categoryId),
											apply: true,
										});
									}}
								>
									Archive empty stale categories
								</ConfirmBtn>
							) : null}
						</div>
					</div>
					<div className="mt-4 grid gap-2 lg:grid-cols-2">
						{categoryCleanupData.candidates.map((candidate) => (
							<div
								key={candidate.categoryId}
								className="rounded-md border bg-muted/20 p-3 text-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate font-medium">
											{candidate.categoryTitle}
										</div>
										<div className="text-xs text-muted-foreground">
											{candidate.categoryUid} · {candidate.activeStandardCount}{" "}
											standard · {candidate.activeCustomCount} custom
										</div>
									</div>
									<Badge
										variant={
											candidate.status === "ready" ? "secondary" : "destructive"
										}
										className="shrink-0"
									>
										{candidate.status}
									</Badge>
								</div>
								<div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>
										{candidate.status === "ready"
											? "No live inventory rows remain."
											: `${candidate.activeInventoryCount} live row(s) must be dispositioned first.`}
									</span>
									<Link
										className="shrink-0 font-medium text-primary underline-offset-4 hover:underline"
										href="/inventory/categories"
									>
										Open categories
									</Link>
								</div>
							</div>
						))}
					</div>
				</Card>
			) : null}

			<Card className="p-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-1">
						<h3 className="font-semibold">Sales Inventory Sync Monitor</h3>
						<p className="max-w-3xl text-sm text-muted-foreground">
							Tracks how far legacy sales have been projected into inventory
							line items, components, allocations, and inbound demand. The
							default backfill action only targets missing inventory-backed sale
							lines.
						</p>
					</div>
					<Badge variant="outline" className="w-fit capitalize">
						{!idleQueryEnabled || salesInventorySyncMonitor.isPending
							? "loading"
							: salesInventorySyncMonitor.data?.status.replace(/_/g, " ")}
					</Badge>
				</div>

				<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
					<StatCard
						title="Synced Sales"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: salesInventorySyncMonitor.data?.syncedSalesCount || 0
						}
						subtitle={`${salesInventorySyncMonitor.data?.skippedAlreadySyncedCount || 0} skipped by default backfill`}
					/>
					<StatCard
						title="Review Risk"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: salesInventorySyncMonitor.data?.failedRiskCount || 0
						}
						subtitle={`${salesInventorySyncMonitor.data?.componentlessSalesCount || 0} componentless • ${salesInventorySyncMonitor.data?.staleInventoryLineItemCount || 0} stale lines • ${reconciliation?.totalDriftCount || 0} drift • ${reconciliation?.skippedComparisonCount || 0} skipped`}
					/>
					<StatCard
						title="Missing Sales"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: salesInventorySyncMonitor.data?.missingSalesCount || 0
						}
						subtitle={
							salesInventorySyncMonitor.data?.backfillCursorId != null
								? `Next cursor ${salesInventorySyncMonitor.data.backfillCursorId}`
								: "No missing sales cursor"
						}
					/>
					<StatCard
						title="Components"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: salesInventorySyncMonitor.data?.componentCount || 0
						}
						subtitle={`${salesInventorySyncMonitor.data?.requiredComponentCount || 0} required • ${salesInventorySyncMonitor.data?.pendingReviewComponentCount || 0} pending review`}
					/>
					<StatCard
						title="Inbound"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: salesInventorySyncMonitor.data
										?.awaitingInboundComponentCount || 0
						}
						subtitle={`${salesInventorySyncMonitor.data?.allocatedComponentCount || 0} allocated • ${salesInventorySyncMonitor.data?.fulfilledComponentCount || 0} fulfilled`}
					/>
					<StatCard
						title="Reconciliation"
						value={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "..."
								: (reconciliation?.totalDriftCount ?? "n/a")
						}
						subtitle={
							!idleQueryEnabled || salesInventorySyncMonitor.isPending
								? "Loading reconciliation summary"
								: reconciliation
									? reconciliation.hasMore
										? `${reconciliation.checkedLineCount} checked • next cursor ${reconciliation.nextCursorId ?? "none"}`
										: `${reconciliation.checkedLineCount} checked • ${reconciliation.status.replace(/_/g, " ")}`
									: "Reconciliation not available"
						}
					/>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						type="button"
						disabled={
							isImportRunning ||
							!salesInventorySyncMonitor.data ||
							salesInventorySyncMonitor.data.missingSalesCount === 0
						}
						onClick={() =>
							runSalesInventoryBackfill.mutate({
								cursorId: salesInventorySyncMonitor.data?.backfillCursorId ?? 0,
								batchSize: 50,
								includeAlreadySynced: false,
								source: "repair",
							})
						}
					>
						<Icons.Refresh className="mr-2 size-4" />
						Queue Next Backfill Batch
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={isImportRunning}
						onClick={() =>
							runSalesInventoryBackfill.mutate({
								cursorId: 0,
								batchSize: 50,
								includeAlreadySynced: true,
								source: "repair",
							})
						}
					>
						<Icons.Search className="mr-2 size-4" />
						Queue Review Batch
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={isImportRunning}
						onClick={() =>
							runInventoryReconciliation.mutate({
								cursorId: reconciliation?.hasMore
									? reconciliation.nextCursorId
									: 0,
								limit: 100,
								sampleLimit: 10,
							})
						}
					>
						<Icons.Search className="mr-2 size-4" />
						Queue Reconciliation
					</Button>
					<ConfirmBtn
						variant="outline"
						icon="Warn"
						disabled={!staleSamples.length}
						isDeleting={cleanupStaleSalesInventoryLines.isPending}
						onClick={async () => {
							cleanupStaleSalesInventoryLines.mutate({
								lineItemIds: staleSamples.map((line) => line.id),
								dryRun: false,
							});
						}}
					>
						Clean Visible Stale Lines
					</ConfirmBtn>
				</div>

				{reconciliationDomainSummaries.length ? (
					<div className="mt-4 rounded-lg border bg-muted/30 p-3">
						<div className="text-sm font-medium">Reconciliation coverage</div>
						<div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
							{reconciliationDomainSummaries.map((domain) => (
								<div
									key={domain.domain}
									className="rounded-md bg-background p-3 text-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="font-medium capitalize">
											{domain.domain.replace(/_/g, " ")}
										</div>
										<Badge
											variant={
												domain.severity === "error"
													? "destructive"
													: domain.severity === "warning"
														? "outline"
														: "secondary"
											}
											className="shrink-0 capitalize"
										>
											{domain.severity}
										</Badge>
									</div>
									<div className="mt-1 text-muted-foreground">
										{domain.checkedCount} checked • {domain.driftCount} drift •{" "}
										{domain.skippedCount} skipped
									</div>
									{domain.skippedReasons.length ? (
										<div className="mt-2 text-xs text-muted-foreground">
											{domain.skippedReasons[0]}
										</div>
									) : null}
								</div>
							))}
						</div>
					</div>
				) : null}

				{salesInventorySyncMonitor.data?.missingSamples.length ? (
					<div className="mt-4 rounded-lg border bg-muted/30 p-3">
						<div className="text-sm font-medium">Next missing sales</div>
						<div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
							{salesInventorySyncMonitor.data.missingSamples.map((sale) => (
								<div
									key={sale.id}
									className="rounded-md bg-background p-3 text-sm"
								>
									<div className="font-medium">{sale.orderId}</div>
									<div className="text-muted-foreground">
										{sale.status || "No status"} • ID {sale.id}
									</div>
								</div>
							))}
						</div>
					</div>
				) : null}

				{reviewSamples.length || staleSamples.length ? (
					<div className="mt-4 grid gap-3 lg:grid-cols-2">
						{reviewSamples.length ? (
							<div className="rounded-lg border bg-muted/30 p-3">
								<div className="text-sm font-medium">
									Synced sales needing review
								</div>
								<div className="mt-2 grid gap-2">
									{reviewSamples.map((sale) => (
										<div
											key={sale.id}
											className="rounded-md bg-background p-3 text-sm"
										>
											<div className="font-medium">{sale.orderId}</div>
											<div className="text-muted-foreground">
												{sale.status || "No status"} • ID {sale.id}
											</div>
										</div>
									))}
								</div>
							</div>
						) : null}

						{staleSamples.length ? (
							<div className="rounded-lg border bg-muted/30 p-3">
								<div className="text-sm font-medium">
									Stale inventory sale lines
								</div>
								<div className="mt-2 grid gap-2">
									{staleSamples.map((line) => (
										<div
											key={line.id}
											className="rounded-md bg-background p-3 text-sm"
										>
											<div className="font-medium">
												{line.title || "Untitled inventory line"}
											</div>
											<div className="text-muted-foreground">
												Line ID {line.id} • Sale{" "}
												{line.sale?.orderId || line.saleId || "missing"}
											</div>
										</div>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</Card>

			<div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
				<Card className="p-5">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<h3 className="font-semibold">Import Actions</h3>
							<p className="text-sm text-muted-foreground">
								Run full inventory updates across the configured sales-settings
								scope. No per-category import action is required here.
							</p>
						</div>
						<Badge variant="outline" className="capitalize">
							{strategy} • {scope}
						</Badge>
					</div>

					<div className="mt-4 flex flex-wrap gap-2">
						{(["active", "all"] as const).map((value) => (
							<Button
								key={value}
								type="button"
								size="sm"
								variant={scope === value ? "default" : "outline"}
								onClick={() => setScope(value)}
							>
								{value === "active" ? "Active Scope" : "All Dyke"}
							</Button>
						))}
						{(["optimized", "handcrafted"] as const).map((value) => (
							<Button
								key={value}
								type="button"
								size="sm"
								variant={strategy === value ? "default" : "outline"}
								onClick={() => setStrategy(value)}
							>
								{value}
							</Button>
						))}
					</div>

					<div className="mt-5 grid gap-3 md:grid-cols-2">
						<Button
							type="button"
							disabled={isImportRunning}
							onClick={() =>
								runFullImport.mutate({
									scope,
									strategy,
									source: "manual",
									compare: false,
									reset: false,
								})
							}
						>
							<Icons.Upload className="mr-2 size-4" />
							Update Inventory
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={isImportRunning}
							onClick={() =>
								runFullImport.mutate({
									scope,
									strategy,
									source: "manual",
									compare: true,
									reset: false,
								})
							}
						>
							<Icons.Search className="mr-2 size-4" />
							System Check
						</Button>
						<Button
							type="button"
							variant="secondary"
							disabled={isImportRunning}
							onClick={() =>
								runFullImport.mutate({
									scope,
									strategy,
									source: "manual",
									compare: false,
									reset: true,
								})
							}
						>
							<Icons.Refresh className="mr-2 size-4" />
							Full Refresh
						</Button>
						<ConfirmBtn
							variant="outline"
							icon="Warn"
							isDeleting={resetInventory.isPending}
							onClick={async () => {
								resetInventory.mutate();
							}}
						>
							Reset Only
						</ConfirmBtn>
					</div>

					<div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
						<div className="font-medium text-foreground">Run notes</div>
						<div className="mt-1">
							`Update Inventory` runs the selected scope without reset as a
							background job. `System Check` runs compare mode. `Full Refresh`
							resets and rebuilds the selected inventory import scope in the
							background. Custom Dyke rows are still imported, but standard
							inventory remains the default operational view.
						</div>
						{currentRunId && runStatus.data ? (
							<div className="mt-3 rounded-md bg-background p-3 text-foreground">
								<div className="font-medium">
									{currentRunLabel || "Inventory import"} status
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									{runStatus.data.status}
								</div>
							</div>
						) : null}
						{lastRunSummary ? (
							<div className="mt-3 rounded-md bg-background p-3 text-foreground">
								{lastRunSummary}
							</div>
						) : null}
					</div>
				</Card>

				<Card className="p-5">
					<div className="space-y-1">
						<h3 className="font-semibold">System Checks</h3>
						<p className="text-sm text-muted-foreground">
							Quick visibility into whether the import area looks safe before
							you run an update.
						</p>
					</div>
					<div className="mt-4 grid gap-3">
						{checks.map((check) => (
							<CheckRow key={check.label} {...check} />
						))}
					</div>
				</Card>
			</div>

			<InventoryImportRunHistory enabled={idleQueryEnabled} />
			<InventoryImportProjectionHistory enabled={idleQueryEnabled} />

			<Card className="p-5">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="space-y-1">
						<h3 className="font-semibold">Scope Breakdown</h3>
						<p className="text-sm text-muted-foreground">
							Read-only Dyke step visibility for debugging and audit. The
							primary workflow above is now scope-driven, not
							category-by-category.
						</p>
					</div>
					<InventoryImportColumnVisibility />
				</div>
				<div className="mt-4">
					<DataTable
						data={rows}
						hasFilters={hasFilters}
						initialSettings={initialTableSettings}
						onClearFilters={() =>
							setFilters({
								q: null,
								scope: null,
							})
						}
						onShowAllScopes={() => setScope("all")}
					/>
				</div>
			</Card>
		</div>
	);
}
