import { randomUUID } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { userHasPermission } from "@gnd/auth/utils";
import { type Database, db } from "@gnd/db";
import {
	evaluateSalesPipelineCommand,
	refreshSalesOrderListProjections,
} from "@gnd/sales";
import {
	type SalesCompletionWriteHooks,
	getSalesCompletionProjection,
	markFulfillmentCompletionStatusOnly,
	markProductionCompletionStatusOnly,
} from "@gnd/sales/sales-completion";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import {
	runDatabaseCli,
	withDatabaseReadRetry,
} from "./sales-pipeline-database-retry";
import {
	classifyAdministrativeResolutionPolicy,
	classifyConflictSourceFacts,
} from "./sales-pipeline-shadow-report";

type SourceReadyOrder = {
	salesOrderId: number;
	orderNo: string | null;
	milestone: string | null;
	canonicalRevision: string | null;
	sourceGuard?: {
		openProductionAssignments: number;
		indeterminateProductionAssignments: number;
		policyReadyMilestones: string[];
	} | null;
	classification: string;
	reasons: string[];
};

type SourceAudit = {
	contract?: string;
	mode?: string;
	unsafeOrders?: number;
	administrativeReadyOrders?: SourceReadyOrder[];
	safety?: {
		writesPerformed?: boolean;
		ambiguousRowsRequireOperatorReview?: boolean;
	};
};

type PlannedOrder = {
	salesOrderId: number;
	orderNo: string | null;
	revision: string;
};

export function buildAdministrativeReconciliationPlan(source: SourceAudit) {
	if (
		source.contract !== "sales-pipeline-source-reconciliation-audit/v1" ||
		source.mode !== "read-only" ||
		source.safety?.writesPerformed !== false ||
		source.safety.ambiguousRowsRequireOperatorReview !== true
	) {
		throw new Error(
			"A complete fail-closed read-only source audit is required",
		);
	}
	const ready = source.administrativeReadyOrders ?? [];
	if (
		!Number.isSafeInteger(source.unsafeOrders) ||
		Number(source.unsafeOrders) < ready.length
	) {
		throw new Error("The source audit has an invalid unsafe-order population");
	}
	const ids = new Set<number>();
	const plan = {
		production: [] as PlannedOrder[],
		fulfillment: [] as PlannedOrder[],
		total: ready.length,
		held: Number(source.unsafeOrders) - ready.length,
	};
	for (const row of ready) {
		if (ids.has(row.salesOrderId)) {
			throw new Error(
				`The source plan contains duplicate order ${row.salesOrderId}`,
			);
		}
		ids.add(row.salesOrderId);
		if (
			row.classification !== "ready" ||
			row.reasons.length > 0 ||
			!Number.isSafeInteger(row.salesOrderId) ||
			row.salesOrderId <= 0
		) {
			throw new Error(
				`Order ${row.salesOrderId} is not a ready reconciliation row`,
			);
		}
		if (
			!row.canonicalRevision ||
			!/^[a-f0-9]{64}$/.test(row.canonicalRevision)
		) {
			throw new Error(
				`Order ${row.salesOrderId} has an invalid canonical revision`,
			);
		}
		if (row.milestone !== "production" && row.milestone !== "fulfillment") {
			throw new Error(
				`Order ${row.salesOrderId} does not have one supported milestone`,
			);
		}
		if (
			!row.sourceGuard ||
			row.sourceGuard.openProductionAssignments !== 0 ||
			row.sourceGuard.indeterminateProductionAssignments !== 0 ||
			row.sourceGuard.policyReadyMilestones.length !== 1 ||
			row.sourceGuard.policyReadyMilestones[0] !== row.milestone
		) {
			throw new Error(
				`Order ${row.salesOrderId} does not have a complete fail-closed source guard`,
			);
		}
		plan[row.milestone].push({
			salesOrderId: row.salesOrderId,
			orderNo: row.orderNo,
			revision: row.canonicalRevision,
		});
	}
	plan.production.sort((left, right) => left.salesOrderId - right.salesOrderId);
	plan.fulfillment.sort(
		(left, right) => left.salesOrderId - right.salesOrderId,
	);
	return plan;
}

export function resolveAdministrativeReconciliationPaths(input: {
	applying: boolean;
	sourceFile?: string;
	outputFile?: string;
	backupFile?: string;
}) {
	if (!input.sourceFile) throw new Error("--source-file is required");
	if (!input.outputFile) throw new Error("--output is required");
	if (input.applying && !input.backupFile)
		throw new Error("--backup-file is required in apply mode");
	const paths = {
		sourceFile: resolve(input.sourceFile),
		outputFile: resolve(input.outputFile),
		journalFile: resolve(`${input.outputFile}.journal`),
		backupFile: input.backupFile ? resolve(input.backupFile) : null,
	};
	const values = [
		paths.sourceFile,
		paths.outputFile,
		paths.journalFile,
		paths.backupFile,
	].filter((value): value is string => Boolean(value));
	if (new Set(values).size !== values.length) {
		throw new Error("Source, output, and backup paths must be distinct");
	}
	return paths;
}

export async function executeFailClosedSequentially<T, R>(
	items: T[],
	execute: (item: T) => Promise<R>,
) {
	const results: R[] = [];
	for (const item of items) results.push(await execute(item));
	return results;
}

export async function openExclusiveReconciliationOutput(path: string) {
	return open(path, "wx", 0o600);
}

export async function writeAllAt(
	writer: {
		write(
			buffer: Uint8Array,
			offset: number,
			length: number,
			position: number,
		): Promise<{ bytesWritten: number }>;
	},
	bytes: Uint8Array,
	position: number,
) {
	let written = 0;
	while (written < bytes.length) {
		const result = await writer.write(
			bytes,
			written,
			bytes.length - written,
			position + written,
		);
		if (result.bytesWritten <= 0)
			throw new Error("File write made zero progress");
		written += result.bytesWritten;
	}
}

async function replaceOwnedFileContents(
	handle: Awaited<ReturnType<typeof openExclusiveReconciliationOutput>>,
	value: unknown,
) {
	const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
	await handle.truncate(0);
	await writeAllAt(handle, bytes, 0);
	await handle.sync();
}

async function appendOwnedJournalEntry(
	handle: Awaited<ReturnType<typeof openExclusiveReconciliationOutput>>,
	value: unknown,
) {
	const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
	const position = (await handle.stat()).size;
	await writeAllAt(handle, bytes, position);
	await handle.sync();
}

const args = new Set(process.argv.slice(2));
const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};

async function refreshListProjection(
	transaction: Parameters<
		NonNullable<SalesCompletionWriteHooks["refreshListProjection"]>
	>[0],
	salesOrderId: number,
) {
	const snapshot = (
		await getSalesPipelineSnapshots(transaction, [salesOrderId])
	).get(salesOrderId);
	if (!snapshot?.freshness.evidenceUpdatedAt) {
		throw new Error(
			`Unable to establish lifecycle revision for order ${salesOrderId}`,
		);
	}
	const result = await refreshSalesOrderListProjections(transaction, [
		{
			salesOrderId,
			sourceUpdatedAt: new Date(snapshot.freshness.evidenceUpdatedAt),
		},
	]);
	if (result.persisted !== 1 || result.skippedAsStale !== 0) {
		throw new Error(`Unable to refresh projection for order ${salesOrderId}`);
	}
}

async function readSnapshots(ids: number[]) {
	const snapshots = new Map<number, SalesPipelineSnapshot>();
	for (let index = 0; index < ids.length; index += 100) {
		const batch = ids.slice(index, index + 100);
		const found = await withDatabaseReadRetry(() =>
			getSalesPipelineSnapshots(db, batch),
		);
		for (const [id, snapshot] of found) snapshots.set(id, snapshot);
	}
	return snapshots;
}

async function assertCurrentPlan(
	plan: ReturnType<typeof buildAdministrativeReconciliationPlan>,
	reason: string,
) {
	const all = [...plan.production, ...plan.fulfillment];
	const snapshots = await readSnapshots(all.map((row) => row.salesOrderId));
	for (const row of all) {
		const snapshot = snapshots.get(row.salesOrderId);
		if (!snapshot || snapshot.revision !== row.revision) {
			throw new Error(
				`Order ${row.salesOrderId} changed after the source audit`,
			);
		}
		const milestone = plan.production.some(
			(item) => item.salesOrderId === row.salesOrderId,
		)
			? "production"
			: "fulfillment";
		const policy = classifyAdministrativeResolutionPolicy(snapshot);
		const facts = classifyConflictSourceFacts(snapshot);
		if (
			policy.readyMilestones.length !== 1 ||
			policy.readyMilestones[0] !== milestone ||
			facts.openProductionAssignments !== 0 ||
			facts.indeterminateProductionAssignments !== 0
		) {
			throw new Error(
				`Order ${row.salesOrderId} no longer satisfies its fail-closed source guard`,
			);
		}
		const decision = evaluateSalesPipelineCommand(snapshot, {
			action: `${milestone}.administrative_complete`,
			authorized: true,
			expectedRevision: row.revision,
			administrativeOverride: true,
			administrativeOverrideReason: reason,
		});
		if (decision.status !== "ready") {
			throw new Error(
				`Order ${row.salesOrderId} is no longer policy-ready: ${decision.reasons.join(",")}`,
			);
		}
	}
	return snapshots;
}

async function requireActor(actorId: number) {
	if (!Number.isSafeInteger(actorId) || actorId <= 0)
		throw new Error("--actor-id is required in apply mode");
	const [canEditOrders, canEditCompletion, actor] = await Promise.all([
		userHasPermission(db, actorId, "editOrders"),
		userHasPermission(db, actorId, "editStatusOnlySalesCompletion"),
		db.users.findUnique({
			where: { id: actorId },
			select: { id: true, name: true },
		}),
	]);
	if (!actor || (!canEditOrders && !canEditCompletion)) {
		throw new Error("The reconciliation actor cannot edit Sales Orders");
	}
	return { id: actor.id, name: actor.name || `User ${actor.id}` };
}

async function main() {
	const applying = args.has("--apply");
	const { sourceFile, outputFile, journalFile, backupFile } =
		resolveAdministrativeReconciliationPaths({
			applying,
			sourceFile: valueAfter("--source-file"),
			outputFile: valueAfter("--output"),
			backupFile: valueAfter("--backup-file"),
		});
	const source = JSON.parse(await readFile(sourceFile, "utf8")) as SourceAudit;
	const plan = buildAdministrativeReconciliationPlan(source);
	const actorId = Number(valueAfter("--actor-id") || 0);
	const reason = valueAfter("--reason")?.trim() || "";
	const report = {
		contract: "sales-pipeline-administrative-reconciliation/v1",
		mode: applying ? "apply" : "dry-run",
		startedAt: new Date().toISOString(),
		reportJournalFile: journalFile,
		sourceFile,
		plan: {
			production: plan.production.length,
			fulfillment: plan.fulfillment.length,
			total: plan.total,
			held: plan.held,
		},
		batches: [] as Array<Record<string, unknown>>,
		writesPerformed: false,
		completed: 0,
		replayed: 0,
		skipped: 0,
		failed: 0,
	};
	const outputHandle = await openExclusiveReconciliationOutput(outputFile);
	let journalHandle: Awaited<
		ReturnType<typeof openExclusiveReconciliationOutput>
	> | null = null;
	try {
		journalHandle = await openExclusiveReconciliationOutput(journalFile);
		const openedJournalHandle = journalHandle;
		const persistReport = async (value: unknown) => {
			await appendOwnedJournalEntry(openedJournalHandle, value);
			await replaceOwnedFileContents(outputHandle, value);
		};
		await persistReport(report);
		if (!applying) {
			await assertCurrentPlan(
				plan,
				"Read-only validation of Ticket 14 fail-closed administrative reconciliation",
			);
			process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
			return;
		}
		if (!reason || !backupFile)
			throw new Error("Apply mode requires --reason and --backup-file");
		const actor = await requireActor(actorId);
		await assertCurrentPlan(plan, reason);
		const ids = [...plan.production, ...plan.fulfillment].map(
			(row) => row.salesOrderId,
		);
		const [completionRecords, projections] = await Promise.all([
			db.salesCompletionRecord.findMany({
				where: { salesOrderId: { in: ids }, state: "ACTIVE" },
				orderBy: { id: "asc" },
			}),
			db.salesOrderListProjection.findMany({
				where: { salesOrderId: { in: ids } },
				orderBy: { salesOrderId: "asc" },
			}),
		]);
		const backupHandle = await openExclusiveReconciliationOutput(backupFile);
		try {
			await replaceOwnedFileContents(backupHandle, {
				contract: "sales-pipeline-administrative-reconciliation-backup/v1",
				createdAt: new Date().toISOString(),
				actorId,
				reason,
				sourceFile,
				plan,
				completionRecords,
				projections,
			});
		} finally {
			await backupHandle.close();
		}

		for (const [milestone, rows] of [
			["production", plan.production],
			["fulfillment", plan.fulfillment],
		] as const) {
			await executeFailClosedSequentially(rows, async (row) => {
				const requestId = randomUUID();
				try {
					await assertCurrentPlan(
						{
							production: milestone === "production" ? [row] : [],
							fulfillment: milestone === "fulfillment" ? [row] : [],
							total: 1,
							held: 0,
						},
						reason,
					);
					const completion = await getSalesCompletionProjection(db, {
						salesOrderId: row.salesOrderId,
					});
					const input = {
						salesOrderId: row.salesOrderId,
						requestId,
						expectedRevision: completion.revision,
						effectiveAt: null,
						administrativeOverride: { reason, expectedRevision: row.revision },
					};
					const result =
						milestone === "production"
							? await markProductionCompletionStatusOnly(
									db as Database,
									input,
									actor,
									{ refreshListProjection },
								)
							: await markFulfillmentCompletionStatusOnly(
									db as Database,
									input,
									actor,
									{ refreshListProjection },
								);
					report.batches.push({
						milestone,
						salesOrderId: row.salesOrderId,
						requestId,
						status: result.idempotentReplay ? "replayed" : "completed",
					});
					if (result.idempotentReplay) report.replayed += 1;
					else report.completed += 1;
					report.writesPerformed ||= !result.idempotentReplay;
					await persistReport(report);
				} catch (error) {
					report.failed += 1;
					report.batches.push({
						milestone,
						salesOrderId: row.salesOrderId,
						requestId,
						status: "failed",
						error: error instanceof Error ? error.message : "Unknown failure",
					});
					await persistReport(report);
					throw error;
				}
				return row.salesOrderId;
			});
		}
		await persistReport({ ...report, completedAt: new Date().toISOString() });
		process.stdout.write(
			`${JSON.stringify({ plan: report.plan, completed: report.completed, replayed: report.replayed, skipped: report.skipped, failed: report.failed, outputFile, backupFile }, null, 2)}\n`,
		);
	} finally {
		await journalHandle?.close();
		await outputHandle.close();
	}
}

if (import.meta.main) await runDatabaseCli(main, () => db.$disconnect());
