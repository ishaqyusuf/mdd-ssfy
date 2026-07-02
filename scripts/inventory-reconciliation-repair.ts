#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";

type CliOptions = {
	apply: boolean;
	confirmReview: boolean;
	json: boolean;
	markdown: boolean;
	includeMissingBackfill: boolean;
	missingCursorId: number | null;
	missingBatchSize: number;
	missingSalesOrderIds: number[] | null;
	staleLineItemIds: number[] | null;
	componentlessSalesOrderIds: number[] | null;
};

type SyncResult = {
	salesOrderId: number;
	orderId: string | null;
	ok: boolean;
	createdCount?: number;
	updatedCount?: number;
	deletedCount?: number;
	skippedCount?: number;
	warnings?: string[];
	error?: string;
};

class UsageError extends Error {}

function usage() {
	console.log(
		[
			"Usage:",
			"  bun run inventory:reconciliation-repair",
			"  bun run inventory:reconciliation-repair --json",
			"  bun run inventory:reconciliation-repair --apply --confirm-review",
			"  bun run inventory:reconciliation-repair --apply --confirm-review --include-missing-backfill",
			"",
			"Options:",
			"  --json                         Print machine-readable repair output",
			"  --markdown                     Print Markdown repair output (default)",
			"  --apply                        Execute reviewed stale/componentless repairs",
			"  --confirm-review               Required with --apply",
			"  --include-missing-backfill      Include one bounded missing-sales backfill batch",
			"  --missing-cursor <n>            Override missing-sales cursor, non-negative integer",
			"  --missing-batch-size <n>        Missing-sales batch size, 1-50, default 50",
			"  --missing-sales-order-ids <csv> Review-specific missing sales order ids",
			"  --stale-line-item-ids <csv>     Review-specific stale line ids",
			"  --componentless-sales-order-ids <csv> Review-specific componentless sales order ids",
		].join("\n"),
	);
}

function parseBoundedInteger(
	name: string,
	value: string | undefined,
	min: number,
	max: number,
) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		throw new UsageError(`${name} must be an integer from ${min} to ${max}.`);
	}
	return parsed;
}

function parsePositiveIntegerCsv(name: string, value: string | undefined) {
	if (!value) throw new UsageError(`${name} requires a comma-separated value.`);
	const ids = value
		.split(",")
		.map((part) => Number(part.trim()))
		.filter((id) => Number.isInteger(id) && id > 0);
	if (ids.length === 0) {
		throw new UsageError(`${name} must include at least one positive integer.`);
	}
	return [...new Set(ids)].sort((a, b) => a - b);
}

function readOptionValue(argv: string[], index: number, name: string) {
	const next = argv[index + 1];
	if (!next || next.startsWith("--")) {
		throw new UsageError(`${name} requires a value.`);
	}
	return next;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		apply: false,
		confirmReview: false,
		json: false,
		markdown: true,
		includeMissingBackfill: false,
		missingCursorId: null,
		missingBatchSize: 50,
		missingSalesOrderIds: null,
		staleLineItemIds: null,
		componentlessSalesOrderIds: null,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		}
		if (arg === "--apply") {
			options.apply = true;
			continue;
		}
		if (arg === "--confirm-review") {
			options.confirmReview = true;
			continue;
		}
		if (arg === "--json") {
			options.json = true;
			options.markdown = false;
			continue;
		}
		if (arg === "--markdown") {
			options.markdown = true;
			options.json = false;
			continue;
		}
		if (arg === "--include-missing-backfill") {
			options.includeMissingBackfill = true;
			continue;
		}
		if (arg === "--missing-cursor") {
			options.missingCursorId = parseBoundedInteger(
				arg,
				readOptionValue(argv, index, arg),
				0,
				Number.MAX_SAFE_INTEGER,
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--missing-cursor=")) {
			options.missingCursorId = parseBoundedInteger(
				"--missing-cursor",
				arg.slice("--missing-cursor=".length),
				0,
				Number.MAX_SAFE_INTEGER,
			);
			continue;
		}
		if (arg === "--missing-batch-size") {
			options.missingBatchSize = parseBoundedInteger(
				arg,
				readOptionValue(argv, index, arg),
				1,
				50,
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--missing-batch-size=")) {
			options.missingBatchSize = parseBoundedInteger(
				"--missing-batch-size",
				arg.slice("--missing-batch-size=".length),
				1,
				50,
			);
			continue;
		}
		if (arg === "--missing-sales-order-ids") {
			options.missingSalesOrderIds = parsePositiveIntegerCsv(
				arg,
				readOptionValue(argv, index, arg),
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--missing-sales-order-ids=")) {
			options.missingSalesOrderIds = parsePositiveIntegerCsv(
				"--missing-sales-order-ids",
				arg.slice("--missing-sales-order-ids=".length),
			);
			continue;
		}
		if (arg === "--stale-line-item-ids") {
			options.staleLineItemIds = parsePositiveIntegerCsv(
				arg,
				readOptionValue(argv, index, arg),
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--stale-line-item-ids=")) {
			options.staleLineItemIds = parsePositiveIntegerCsv(
				"--stale-line-item-ids",
				arg.slice("--stale-line-item-ids=".length),
			);
			continue;
		}
		if (arg === "--componentless-sales-order-ids") {
			options.componentlessSalesOrderIds = parsePositiveIntegerCsv(
				arg,
				readOptionValue(argv, index, arg),
			);
			index += 1;
			continue;
		}
		if (arg.startsWith("--componentless-sales-order-ids=")) {
			options.componentlessSalesOrderIds = parsePositiveIntegerCsv(
				"--componentless-sales-order-ids",
				arg.slice("--componentless-sales-order-ids=".length),
			);
			continue;
		}
		throw new UsageError(`Unknown argument: ${arg}`);
	}

	if (options.apply && !options.confirmReview) {
		throw new UsageError("--apply requires --confirm-review.");
	}
	if (options.missingSalesOrderIds?.length && !options.includeMissingBackfill) {
		throw new UsageError(
			"--missing-sales-order-ids requires --include-missing-backfill.",
		);
	}

	return options;
}

function redactDatabaseUrl(value: string | undefined) {
	if (!value) return "<unset>";
	try {
		const url = new URL(value);
		url.username = url.username ? "redacted" : "";
		url.password = url.password ? "redacted" : "";
		return url.toString();
	} catch {
		return "<redacted>";
	}
}

async function getComponentlessSalesOrderIds(
	db: any,
	explicitIds: number[] | null,
) {
	const rows = await db.lineItem.findMany({
		where: {
			deletedAt: null,
			lineItemType: "SALE",
			...(explicitIds?.length
				? {
						saleId: {
							in: explicitIds,
						},
					}
				: {}),
			sale: {
				is: {
					deletedAt: null,
				},
			},
			components: {
				none: {},
			},
		},
		select: {
			sale: {
				select: {
					id: true,
				},
			},
		},
		take: 500,
	});
	const currentIds = [
		...new Set(
			rows
				.map((row: any) => row.sale?.id)
				.filter((id: unknown): id is number => Number.isInteger(id)),
		),
	].sort((a, b) => a - b);
	const skippedExplicitIds =
		explicitIds?.filter((id) => !currentIds.includes(id)) ?? [];

	return {
		salesOrderIds: currentIds,
		skippedExplicitIds,
	};
}

async function getMissingSalesBatch(
	db: any,
	input: {
		cursorId: number;
		batchSize: number;
	},
) {
	const orders = await db.salesOrders.findMany({
		where: {
			deletedAt: null,
			id: {
				gt: input.cursorId,
			},
			lineItems: {
				none: {
					deletedAt: null,
					lineItemType: "SALE",
				},
			},
		},
		orderBy: {
			id: "asc",
		},
		take: input.batchSize,
		select: {
			id: true,
			orderId: true,
		},
	});
	return {
		orders,
		skippedExplicitIds: [] as number[],
		scope: "cursor",
	};
}

async function getMissingSalesByIds(db: any, salesOrderIds: number[]) {
	const orders = await db.salesOrders.findMany({
		where: {
			deletedAt: null,
			id: {
				in: salesOrderIds,
			},
			lineItems: {
				none: {
					deletedAt: null,
					lineItemType: "SALE",
				},
			},
		},
		orderBy: {
			id: "asc",
		},
		select: {
			id: true,
			orderId: true,
		},
	});
	const currentIds = orders.map((order: any) => order.id);
	return {
		orders,
		skippedExplicitIds: salesOrderIds.filter(
			(id) => !currentIds.includes(id),
		),
		scope: "explicit_ids",
	};
}

async function syncSalesOrders(
	db: any,
	syncSalesInventoryLineItems: any,
	orders: Array<{ id: number; orderId: string | null }>,
) {
	const results: SyncResult[] = [];

	for (const order of orders) {
		try {
			const result = await db.$transaction((tx: any) =>
				syncSalesInventoryLineItems(tx, {
					salesOrderId: order.id,
					source: "repair",
					triggeredByUserId: null,
				}),
			);
			results.push({
				salesOrderId: order.id,
				orderId: order.orderId,
				ok: true,
				createdCount: result.createdCount,
				updatedCount: result.updatedCount,
				deletedCount: result.deletedCount,
				skippedCount: result.skippedCount,
				warnings: result.warnings,
			});
		} catch (error) {
			results.push({
				salesOrderId: order.id,
				orderId: order.orderId,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return results;
}

function syncResultWriteCount(result: SyncResult) {
	return (
		(result.createdCount ?? 0) +
		(result.updatedCount ?? 0) +
		(result.deletedCount ?? 0)
	);
}

function syncResultIsMappingBlocked(result: SyncResult) {
	return (
		result.ok &&
		syncResultWriteCount(result) === 0 &&
		(result.warnings || []).some((warning) =>
			warning.includes("missing deterministic inventory mapping"),
		)
	);
}

function summarizeSyncResults(results: SyncResult[]) {
	return {
		materialAppliedCount: results.filter(
			(result) => result.ok && syncResultWriteCount(result) > 0,
		).length,
		noOpCount: results.filter(
			(result) => result.ok && syncResultWriteCount(result) === 0,
		).length,
		mappingBlockedCount: results.filter(syncResultIsMappingBlocked).length,
		createdCount: results.reduce(
			(total, result) => total + (result.createdCount ?? 0),
			0,
		),
		updatedCount: results.reduce(
			(total, result) => total + (result.updatedCount ?? 0),
			0,
		),
		deletedCount: results.reduce(
			(total, result) => total + (result.deletedCount ?? 0),
			0,
		),
		skippedItemCount: results.reduce(
			(total, result) => total + (result.skippedCount ?? 0),
			0,
		),
		warningCount: results.reduce(
			(total, result) => total + (result.warnings?.length ?? 0),
			0,
		),
	};
}

function renderMarkdown(payload: any) {
	const componentless = payload.componentlessSync;
	const missing = payload.missingBackfill;
	const stale = payload.staleCleanup;

	return [
		"# Inventory Reconciliation Repair",
		"",
		`- Generated At: ${payload.generatedAt}`,
		`- Database: ${payload.databaseUrl}`,
		`- Mode: ${payload.mode}`,
		`- Mutated Data: ${payload.mutatedData ? "yes" : "no"}`,
		`- Evidence Rerun: \`${payload.evidenceRerunCommand}\``,
		"",
		"## Stale Cleanup",
		`- Matched Lines: ${stale.result.matchedCount}`,
		`- Component Count: ${stale.result.componentCount}`,
		`- Line Item Ids: ${stale.result.lineItemIds.join(", ") || "-"}`,
		`- Cleaned Lines: ${stale.result.cleanedLineItemCount}`,
		`- Dry Run: ${stale.result.dryRun ? "yes" : "no"}`,
		"",
		"## Componentless Sales Sync",
		`- Candidate Sales Order Ids: ${
			componentless.salesOrderIds.join(", ") || "-"
		}`,
		`- Skipped Explicit Ids: ${
			componentless.skippedExplicitIds.join(", ") || "-"
		}`,
		`- Planned Count: ${componentless.plannedCount}`,
		`- Applied Count: ${componentless.appliedCount}`,
		`- Failed Count: ${componentless.failedCount}`,
		`- Material Applied Count: ${componentless.summary.materialAppliedCount}`,
		`- No-op Count: ${componentless.summary.noOpCount}`,
		`- Mapping Blocked Count: ${componentless.summary.mappingBlockedCount}`,
		"",
		"## Missing Sales Backfill",
		`- Included: ${missing.included ? "yes" : "no"}`,
		`- Scope: ${missing.scope}`,
		`- Cursor: ${missing.cursorId}`,
		`- Batch Size: ${missing.batchSize}`,
		`- Sales Order Ids: ${missing.salesOrderIds.join(", ") || "-"}`,
		`- Skipped Explicit Ids: ${missing.skippedExplicitIds.join(", ") || "-"}`,
		`- Planned Count: ${missing.plannedCount}`,
		`- Applied Count: ${missing.appliedCount}`,
		`- Failed Count: ${missing.failedCount}`,
		`- Material Applied Count: ${missing.summary.materialAppliedCount}`,
		`- No-op Count: ${missing.summary.noOpCount}`,
		`- Mapping Blocked Count: ${missing.summary.mappingBlockedCount}`,
		`- Created Lines: ${missing.summary.createdCount}`,
		`- Updated Lines: ${missing.summary.updatedCount}`,
		`- Deleted Lines: ${missing.summary.deletedCount}`,
		`- Skipped Sales Items: ${missing.summary.skippedItemCount}`,
		`- Warning Count: ${missing.summary.warningCount}`,
		"",
		"## Gate Status",
		payload.mutatedData
			? "- Repairs were applied. Rerun reconciliation evidence before making any clean-gate claim."
			: "- No data was mutated. Use `--apply --confirm-review` only after reviewing this output and the evidence report.",
	].join("\n");
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;

	const [{ db }, monitorModule, syncModule] = await Promise.all([
		import("../packages/db/src/index.ts"),
		import("../packages/sales/src/sales-inventory-sync-monitor.ts"),
		import("../packages/sales/src/sync-sales-inventory-line-items.ts"),
	]);

	try {
		const monitor = await monitorModule.getSalesInventorySyncMonitor(db, {
			sampleLimit: 10,
			includeReconciliation: false,
		});
		const staleDryRun = await monitorModule.cleanupStaleSalesInventoryLineItems(
			db,
			{
				lineItemIds: options.staleLineItemIds ?? undefined,
				dryRun: true,
				limit: options.staleLineItemIds?.length ?? 50,
			},
		);
		const staleApply =
			options.apply && staleDryRun.lineItemIds.length
				? await monitorModule.cleanupStaleSalesInventoryLineItems(db, {
						lineItemIds: staleDryRun.lineItemIds,
						dryRun: false,
						limit: staleDryRun.lineItemIds.length,
					})
				: null;

		const componentless = await getComponentlessSalesOrderIds(
			db,
			options.componentlessSalesOrderIds,
		);
		const componentlessOrders = componentless.salesOrderIds.length
			? await db.salesOrders.findMany({
					where: {
						id: {
							in: componentless.salesOrderIds,
						},
					},
					orderBy: {
						id: "asc",
					},
					select: {
						id: true,
						orderId: true,
					},
				})
			: [];
		const componentlessResults = options.apply
			? await syncSalesOrders(
					db,
					syncModule.syncSalesInventoryLineItems,
					componentlessOrders,
				)
			: [];

		const missingCursorId =
			options.missingCursorId ?? monitor.backfillCursorId ?? 0;
		const missingPlan = options.includeMissingBackfill
			? options.missingSalesOrderIds?.length
				? await getMissingSalesByIds(db, options.missingSalesOrderIds)
				: await getMissingSalesBatch(db, {
						cursorId: missingCursorId,
						batchSize: options.missingBatchSize,
					})
			: { orders: [], skippedExplicitIds: [], scope: "excluded" };
		const missingOrders = missingPlan.orders;
		const missingResults =
			options.apply && options.includeMissingBackfill
				? await syncSalesOrders(
						db,
						syncModule.syncSalesInventoryLineItems,
						missingOrders,
					)
				: [];

		const payload = {
			generatedAt: new Date().toISOString(),
			databaseUrl: redactDatabaseUrl(process.env.DATABASE_URL),
			mode: options.apply ? "apply" : "dry-run",
			mutatedData: options.apply,
			evidenceRerunCommand:
				"bun --env-file=.env.local run inventory:reconciliation-evidence --markdown",
			staleCleanup: {
				result: staleApply ?? staleDryRun,
				dryRunResult: staleDryRun,
			},
			componentlessSync: {
				salesOrderIds: componentless.salesOrderIds,
				skippedExplicitIds: componentless.skippedExplicitIds,
				plannedCount: componentlessOrders.length,
				appliedCount: componentlessResults.filter((result) => result.ok).length,
				failedCount: componentlessResults.filter((result) => !result.ok).length,
				summary: summarizeSyncResults(componentlessResults),
				results: componentlessResults,
			},
			missingBackfill: {
				included: options.includeMissingBackfill,
				scope: missingPlan.scope,
				cursorId: missingCursorId,
				batchSize: options.missingBatchSize,
				salesOrderIds: missingOrders.map((order: any) => order.id),
				skippedExplicitIds: missingPlan.skippedExplicitIds,
				plannedCount: missingOrders.length,
				appliedCount: missingResults.filter((result) => result.ok).length,
				failedCount: missingResults.filter((result) => !result.ok).length,
				summary: summarizeSyncResults(missingResults),
				orders: missingOrders,
				results: missingResults,
			},
		};

		if (options.json) {
			console.log(JSON.stringify(payload, null, 2));
			return;
		}

		console.log(renderMarkdown(payload));
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	if (error instanceof UsageError) {
		console.error(error.message);
		usage();
		process.exit(1);
	}
	console.error(error);
	process.exit(1);
});
