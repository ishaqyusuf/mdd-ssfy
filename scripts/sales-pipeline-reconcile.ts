import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { userHasPermission } from "@gnd/auth/utils";
import { type Prisma, db } from "@gnd/db";
import {
	classifySalesPipelineReconciliation,
	refreshSalesOrderListProjections,
	salesOrderListProjectionVersion,
	summarizeSalesPipelineReconciliation,
} from "@gnd/sales";
import { salesCompletionProjectionSourceRevision } from "@gnd/sales/sales-completion";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import {
	runDatabaseCli,
	withDatabaseReadRetry,
	withDeterministicProjectionRepairRetry,
} from "./sales-pipeline-database-retry";

export {
	isRetryableDatabaseConnectionError,
	withDatabaseReadRetry,
	withDeterministicProjectionRepairRetry,
} from "./sales-pipeline-database-retry";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};
const batchSize = Math.min(
	100,
	Math.max(1, Number(valueAfter("--batch-size") || 50)),
);
const outputPath = valueAfter("--output");

export function buildSalesPipelineReconciliationOrderWhere(argv: string[]) {
	const base = { type: "order", deletedAt: null } as const;
	const flags = argv.filter(
		(arg) => arg === "--order-id" || arg.startsWith("--order-id="),
	);
	if (flags.length === 0) return base;
	if (flags.length > 1) throw new Error("--order-id may only be supplied once");
	if (
		argv.some((arg) => arg === "--undo-run" || arg.startsWith("--undo-run="))
	) {
		throw new Error("--order-id cannot be combined with --undo-run");
	}
	const flag = flags[0];
	if (!flag) return base;
	const orderId =
		flag === "--order-id"
			? (argv[argv.indexOf(flag) + 1] ?? "")
			: flag.slice("--order-id=".length);
	const parsed = Number(orderId);
	if (!/^\d+$/.test(orderId) || !Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error("--order-id must be a positive safe integer");
	}
	return { ...base, id: parsed };
}

export function buildSalesPipelineProjectionEvidence(input: {
	projection: {
		state: string | null;
		version: number | null;
		sourceUpdatedAt: Date | null;
		pipelineRevision: string | null;
		pipelineContractVersion: string | null;
		payload?: unknown;
	} | null;
	orderUpdatedAt: Date | null;
	expectedVersion: number;
}) {
	return {
		exists: Boolean(input.projection),
		state: input.projection?.state ?? null,
		version: input.projection?.version ?? null,
		expectedVersion: input.expectedVersion,
		sourceUpdatedAt: input.projection?.sourceUpdatedAt ?? null,
		orderUpdatedAt: input.orderUpdatedAt,
		pipelineRevision: input.projection?.pipelineRevision ?? null,
		pipelineVersion: input.projection?.pipelineContractVersion ?? null,
	};
}

async function resetProductionDatabaseConnection() {
	try {
		await db.$disconnect();
	} catch {
		// The next Prisma operation reconnects and re-resolves the provider host.
	}
}

async function withProductionDatabaseReadRetry<T>(operation: () => Promise<T>) {
	return withDatabaseReadRetry(operation, {
		onRetry: resetProductionDatabaseConnection,
	});
}

async function assertAuthorized(actorId: number) {
	const canEditProduction = await withProductionDatabaseReadRetry(() =>
		userHasPermission(db, actorId, "editProduction"),
	);
	const canFulfill = canEditProduction
		? await withProductionDatabaseReadRetry(() =>
				userHasPermission(db, actorId, "viewMarkSalesOrderFulfilled"),
			)
		: false;
	if (!(canEditProduction && canFulfill)) {
		throw new Error(
			"The reconciliation actor must be authorized for both Production and Fulfillment lifecycle changes.",
		);
	}
}

export function restoreProjectionDates(projection: Record<string, unknown>) {
	const restored = { ...projection };
	for (const key of [
		"salesCreatedAt",
		"salesDeletedAt",
		"sourceUpdatedAt",
		"projectedAt",
	] as const) {
		if (typeof restored[key] === "string") {
			restored[key] = new Date(restored[key]);
		}
	}
	return restored;
}

export type SalesPipelineReconciliationBackupRecord = {
	salesOrderId: number;
	postPipelineRevision: string;
	previous: Record<string, unknown> | null;
};

type SalesPipelineReconciliationEvidenceItem = {
	category:
		| "clean"
		| "deterministic_repair"
		| "known_compatibility_difference"
		| "review_required"
		| "unsafe";
	reasons: string[];
};

const reconciliationEvidenceCategories = [
	"unsafe",
	"deterministic_repair",
	"review_required",
	"known_compatibility_difference",
] as const;

export function buildSalesPipelineReconciliationEvidence<
	T extends SalesPipelineReconciliationEvidenceItem,
>(classified: T[], sampleLimit = 25) {
	const reasonCounts = new Map<string, number>();
	for (const item of classified) {
		for (const reason of item.reasons) {
			reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
		}
	}
	return {
		reasonCounts: Object.fromEntries(
			[...reasonCounts.entries()].sort(
				([leftReason, leftCount], [rightReason, rightCount]) =>
					rightCount - leftCount || leftReason.localeCompare(rightReason),
			),
		),
		samplesByCategory: Object.fromEntries(
			reconciliationEvidenceCategories.map((category) => [
				category,
				classified
					.filter((item) => item.category === category)
					.slice(0, sampleLimit),
			]),
		),
	};
}

type ProjectionUndoStore = {
	deleteMany(input: {
		where: { salesOrderId: number; pipelineRevision: string };
	}): Promise<{ count: number }>;
	updateMany(input: {
		where: { salesOrderId: number; pipelineRevision: string };
		data: never;
	}): Promise<{ count: number }>;
};

export async function restoreSalesPipelineProjectionRecord(
	store: ProjectionUndoStore,
	record: SalesPipelineReconciliationBackupRecord,
) {
	if (!record.previous) {
		const deleted = await store.deleteMany({
			where: {
				salesOrderId: record.salesOrderId,
				pipelineRevision: record.postPipelineRevision,
			},
		});
		return deleted.count === 1 ? "restored" : "skipped_as_changed";
	}
	const {
		id: _id,
		salesOrderId: _salesOrderId,
		createdAt: _createdAt,
		updatedAt: _updatedAt,
		...stored
	} = record.previous;
	const updated = await store.updateMany({
		where: {
			salesOrderId: record.salesOrderId,
			pipelineRevision: record.postPipelineRevision,
		},
		data: restoreProjectionDates(stored) as never,
	});
	return updated.count === 1 ? "restored" : "skipped_as_changed";
}

async function undoRun(input: {
	file: string;
	actorId: number;
	reason: string;
}) {
	await assertAuthorized(input.actorId);
	const backup = JSON.parse(await readFile(input.file, "utf8")) as {
		contract: string;
		runId: string;
		records: SalesPipelineReconciliationBackupRecord[];
	};
	if (backup.contract !== "sales-pipeline-reconciliation-backup/v2") {
		throw new Error(
			"Unsupported or unsafe reconciliation backup contract. Only v2 backups carry the post-repair revision required for compare-and-set undo.",
		);
	}
	let restored = 0;
	let skippedAsChanged = 0;
	for (const record of backup.records) {
		const outcome = await restoreSalesPipelineProjectionRecord(
			db.salesOrderListProjection,
			record,
		);
		if (outcome === "restored") restored += 1;
		else skippedAsChanged += 1;
	}
	console.log(
		JSON.stringify(
			{
				contract: "sales-pipeline-reconciliation-undo/v1",
				runId: backup.runId,
				actorId: input.actorId,
				reason: input.reason,
				restored,
				skippedAsChanged,
				finishedAt: new Date().toISOString(),
			},
			null,
			2,
		),
	);
}

async function main() {
	// A present flag without a value must never silently become a full scan.
	const orderWhere = buildSalesPipelineReconciliationOrderWhere(
		process.argv.slice(2),
	);
	const runId = randomUUID();
	const startedAt = new Date();
	const actorId = Number(valueAfter("--actor-id") || 0);
	const reason = valueAfter("--reason")?.trim();
	const undoFile = valueAfter("--undo-run");
	if (undoFile) {
		if (!actorId || !reason) {
			throw new Error(
				"--undo-run requires --actor-id and --reason for auditability.",
			);
		}
		await undoRun({ file: resolve(undoFile), actorId, reason });
		return;
	}
	if (apply && (!actorId || !reason)) {
		throw new Error(
			"--apply requires --actor-id and --reason for auditability.",
		);
	}
	if (apply) await assertAuthorized(actorId);
	const orderSelect = {
		id: true,
		orderId: true,
		createdAt: true,
		updatedAt: true,
		completionRecords: {
			orderBy: { updatedAt: "desc" },
			take: 1,
			select: { updatedAt: true },
		},
		listProjection: {
			select: {
				id: true,
				salesOrderId: true,
				orgId: true,
				salesRepId: true,
				customerId: true,
				orderId: true,
				slug: true,
				type: true,
				status: true,
				prodStatus: true,
				amountDue: true,
				invoiceTotal: true,
				salesCreatedAt: true,
				salesDeletedAt: true,
				sourceUpdatedAt: true,
				version: true,
				state: true,
				pipelineContractVersion: true,
				pipelineRevision: true,
				pipelineHeadline: true,
				pipelineProductionApplicability: true,
				pipelineProductionState: true,
				pipelineFulfillmentApplicability: true,
				pipelineFulfillmentState: true,
				payload: true,
				lastError: true,
				projectedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		},
	} satisfies Prisma.SalesOrdersSelect;
	const orders: Array<
		Prisma.SalesOrdersGetPayload<{ select: typeof orderSelect }>
	> = [];
	let orderCursor: number | undefined;
	for (;;) {
		const page = await withProductionDatabaseReadRetry(() =>
			db.salesOrders.findMany({
				where: orderWhere,
				orderBy: { id: "asc" },
				select: orderSelect,
				take: 250,
				...(orderCursor ? { cursor: { id: orderCursor }, skip: 1 } : {}),
			}),
		);
		orders.push(...page);
		orderCursor = page.at(-1)?.id;
		if (page.length < 250 || !orderCursor) break;
	}
	const snapshots = new Map<number, SalesPipelineSnapshot>();
	for (let index = 0; index < orders.length; index += batchSize) {
		const batch = await withProductionDatabaseReadRetry(() =>
			getSalesPipelineSnapshots(
				db,
				orders.slice(index, index + batchSize).map((order) => order.id),
			),
		);
		for (const [id, snapshot] of batch) snapshots.set(id, snapshot);
	}
	const classified = orders.map((order) => {
		const snapshot = snapshots.get(order.id);
		const sourceUpdatedAt = snapshot?.freshness.evidenceUpdatedAt
			? new Date(snapshot.freshness.evidenceUpdatedAt)
			: salesCompletionProjectionSourceRevision(order);
		const classification = classifySalesPipelineReconciliation({
			snapshot: snapshot ?? null,
			projection: buildSalesPipelineProjectionEvidence({
				projection: order.listProjection,
				orderUpdatedAt: sourceUpdatedAt,
				expectedVersion: salesOrderListProjectionVersion(),
			}),
		});
		return {
			id: order.id,
			orderNo: order.orderId,
			sourceUpdatedAt,
			category: classification.category,
			repairable: classification.repairable,
			revision: snapshot?.revision ?? null,
			reasons: classification.reasons,
		};
	});
	const counts = summarizeSalesPipelineReconciliation(classified);
	const evidence = buildSalesPipelineReconciliationEvidence(classified);
	const repairable = classified.filter((item) => item.repairable);
	let backupFile: string | null = null;
	let repaired = 0;
	const batches: Array<{
		index: number;
		requested: number;
		persisted: number;
		skippedAsStale: number;
	}> = [];
	if (apply) {
		backupFile = resolve(
			valueAfter("--backup-file") ||
				`.scratch/sales-pipeline-lifecycle-implementation/reconciliation-runs/${runId}.json`,
		);
		await mkdir(dirname(backupFile), { recursive: true });
		await writeFile(
			backupFile,
			JSON.stringify(
				{
					contract: "sales-pipeline-reconciliation-backup/v2",
					runId,
					actorId,
					reason,
					createdAt: new Date().toISOString(),
					records: repairable.map((item) => ({
						salesOrderId: item.id,
						postPipelineRevision: item.revision,
						previous:
							orders.find((order) => order.id === item.id)?.listProjection ??
							null,
					})),
				},
				null,
				2,
			),
			"utf8",
		);
		for (let index = 0; index < repairable.length; index += batchSize) {
			const batch = repairable.slice(index, index + batchSize);
			const result = await withDeterministicProjectionRepairRetry(
				() =>
					refreshSalesOrderListProjections(
						db,
						batch.map((item) => ({
							salesOrderId: item.id,
							sourceUpdatedAt: item.sourceUpdatedAt,
						})),
						{
							runRead: withProductionDatabaseReadRetry,
							serializeReads: true,
						},
					),
				{
					attempts: 5,
					onRetry: resetProductionDatabaseConnection,
				},
			);
			repaired += result.persisted;
			batches.push({
				index: index / batchSize,
				requested: batch.length,
				persisted: result.persisted,
				skippedAsStale: result.skippedAsStale,
			});
		}
	}
	const report = {
		contract: "sales-pipeline-reconciliation/v1",
		runId,
		mode: apply ? "apply" : "dry-run",
		scope: { salesOrderId: "id" in orderWhere ? orderWhere.id : null },
		startedAt: startedAt.toISOString(),
		finishedAt: new Date().toISOString(),
		actorId: apply ? actorId : null,
		reason: apply ? reason : null,
		batchSize,
		counts,
		...evidence,
		repaired,
		remainingDeterministicRepairs: Math.max(0, repairable.length - repaired),
		batches,
		backupFile,
		undoCommand: backupFile
			? `bun run sales-pipeline:reconcile --undo-run ${backupFile} --actor-id <id> --reason <reason>`
			: null,
		samples: classified
			.filter((item) => item.category !== "clean")
			.slice(0, 25),
		safety:
			"Only the recomputable SalesOrderListProjection cache is eligible for apply; operational facts are never rewritten.",
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8");
	process.stdout.write(serialized);
}

if (import.meta.main) {
	await runDatabaseCli(main, () => db.$disconnect());
}
