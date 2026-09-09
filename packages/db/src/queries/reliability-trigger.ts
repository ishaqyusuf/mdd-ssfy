import type {
	PreparedTriggerRun,
	TriggerRunSource,
} from "@gnd/observability/reliability";
import type { Database } from "../index";
import { ingestReliabilityOccurrence } from "./reliability";

/** Read-only health boundary for a monitor outside the ingestion scheduler. */
export async function getTriggerReconciliationHealth(
	db: Database,
	source: Pick<TriggerRunSource, "account" | "project"> & {
		service: { id: string };
	},
	input: { cursorId: string; now: Date; maxAgeMs: number },
) {
	if (
		!/^[a-f0-9]{64}$/.test(input.cursorId) ||
		!Number.isFinite(input.now.getTime()) ||
		!Number.isInteger(input.maxAgeMs) ||
		input.maxAgeMs < 300_000 ||
		input.maxAgeMs > 86_400_000
	)
		throw new Error("Invalid Trigger health query");
	const cutoff = new Date(input.now.getTime() - input.maxAgeMs);
	const [cursor, staleWatches] = await Promise.all([
		db.reliabilityCursor.findUnique({ where: { id: input.cursorId } }),
		db.reliabilityRunWatch.count({
			where: {
				serviceId: source.service.id,
				account: source.account,
				project: source.project,
				environment: "production",
				terminal: false,
				OR: [
					{ lastCheckedAt: { lt: cutoff } },
					{ lastCheckedAt: null, providerCreatedAt: { lt: cutoff } },
				],
			},
		}),
	]);
	const reasons: string[] = [];
	if (!cursor?.watermark || !cursor.lastSuccessAt)
		reasons.push("DISCOVERY_NEVER_COMPLETED");
	else {
		if (cursor.watermark > input.now || cursor.lastSuccessAt > input.now)
			reasons.push("DISCOVERY_CLOCK_INVALID");
		if (cursor.watermark < cutoff) reasons.push("DISCOVERY_BEHIND");
		if (cursor.lastSuccessAt < cutoff) reasons.push("POLL_STALE");
	}
	if (staleWatches > 0) reasons.push("WATCHES_STALE");
	return {
		status: reasons.length ? ("stale" as const) : ("healthy" as const),
		reasons,
		staleWatches,
		watermark: cursor?.watermark ?? null,
		lastSuccessAt: cursor?.lastSuccessAt ?? null,
	};
}

export async function recordTriggerRunObservation(
	db: Database,
	run: PreparedTriggerRun,
	now: Date,
) {
	if (!Number.isFinite(now.getTime()))
		throw new Error("Invalid Trigger observation clock");
	const previous = await db.reliabilityRunWatch.findUnique({
		where: { watchKey: run.watchKey },
	});
	if (
		previous?.providerUpdatedAt &&
		previous.providerUpdatedAt > run.providerUpdatedAt
	)
		return previous;
	if (
		previous?.providerUpdatedAt?.getTime() ===
			run.providerUpdatedAt.getTime() &&
		previous.providerStatus !== run.providerStatus
	)
		throw new Error("Conflicting Trigger run revision");
	// Never retire a failed run from observation before its incident has committed.
	// A crash between these writes leaves the run eligible for safe deduplicated retry.
	if (run.intake) await ingestReliabilityOccurrence(db, run.intake);
	await db.reliabilityRunWatch.createMany({
		data: [
			{
				watchKey: run.watchKey,
				serviceId: run.serviceId,
				account: run.account,
				project: run.project,
				environment: run.environment,
				runId: run.runId,
				providerStatus: "UNVERIFIED",
				terminal: false,
				providerCreatedAt: run.providerCreatedAt,
			},
		],
		skipDuplicates: true,
	});
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM ReliabilityRunWatch WHERE watchKey = ${run.watchKey} FOR UPDATE`;
			const saved = await tx.reliabilityRunWatch.findUniqueOrThrow({
				where: { watchKey: run.watchKey },
			});
			if (
				saved.providerUpdatedAt &&
				saved.providerUpdatedAt > run.providerUpdatedAt
			)
				return saved;
			if (
				saved.providerUpdatedAt?.getTime() ===
					run.providerUpdatedAt.getTime() &&
				saved.providerStatus !== run.providerStatus
			)
				throw new Error("Conflicting Trigger run revision");
			return tx.reliabilityRunWatch.update({
				where: { watchKey: run.watchKey },
				data: {
					providerStatus: run.providerStatus,
					terminal: run.terminal,
					providerUpdatedAt: run.providerUpdatedAt,
					lastCheckedAt: now,
					nextCheckAt: new Date(now.getTime() + 300_000),
				},
			});
		},
		{ timeout: 10_000 },
	);
}

export function getDueTriggerWatches(
	db: Database,
	source: TriggerRunSource,
	input: { now: Date; limit: number },
) {
	if (
		!Number.isFinite(input.now.getTime()) ||
		!Number.isInteger(input.limit) ||
		input.limit < 1 ||
		input.limit > 100
	)
		throw new Error("Invalid Trigger watch query");
	return db.reliabilityRunWatch.findMany({
		where: {
			serviceId: source.service.id,
			account: source.account,
			project: source.project,
			environment: "production",
			terminal: false,
			nextCheckAt: { lte: input.now },
		},
		orderBy: [{ nextCheckAt: "asc" }, { id: "asc" }],
		take: input.limit,
	});
}

export async function deferTriggerWatch(
	db: Database,
	input: {
		watchKey: string;
		expectedUpdatedAt: Date | null;
		now: Date;
		retryAt: Date;
	},
) {
	const delay = input.retryAt.getTime() - input.now.getTime();
	if (!Number.isFinite(delay) || delay < 1000 || delay > 86_400_000)
		throw new Error("Invalid Trigger watch retry");
	return db.reliabilityRunWatch.updateMany({
		where: {
			watchKey: input.watchKey,
			terminal: false,
			providerUpdatedAt: input.expectedUpdatedAt,
			nextCheckAt: { lte: input.now },
		},
		data: { nextCheckAt: input.retryAt },
	});
}
