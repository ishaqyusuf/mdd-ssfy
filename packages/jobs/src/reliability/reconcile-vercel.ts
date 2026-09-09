import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import {
	claimReliabilityCursor,
	deferReliabilityCursor,
	ingestReliabilityOccurrence,
	recordReliabilityCursorPage,
} from "@gnd/db/queries";
import {
	type PreparedIncidentIntake,
	type VercelLogSource,
	advanceVercelQueryWindows,
	resumeVercelQueryWindows,
} from "@gnd/observability/reliability";

export async function reconcileVercelSource(
	db: Database,
	source: VercelLogSource,
	options: {
		now: () => Date;
		maxQueries: number;
		maxDurationMs: number;
		lookbackMs: number;
		limit: number;
	},
	read: (window: { since: Date; until: Date; limit: number }) => Promise<{
		intakes: PreparedIncidentIntake[];
		saturated: boolean;
	}>,
) {
	for (const [value, min, max] of [
		[options.maxQueries, 1, 20],
		[options.maxDurationMs, 1000, 240_000],
		[options.lookbackMs, 300_000, 86_400_000],
		[options.limit, 1, 1000],
	] as const) {
		if (!Number.isInteger(value) || value < min || value > max)
			throw new Error("Invalid Vercel reconciliation budget");
	}
	const started = options.now();
	const id = createHash("sha256")
		.update(
			JSON.stringify([
				"vercel-query",
				source.service.id,
				source.account,
				source.project,
				"production",
			]),
		)
		.digest("hex");
	const claim = await claimReliabilityCursor(db, {
		id,
		now: started,
		leaseMs: options.maxDurationMs + 30_000,
		initialWindowStart: new Date(started.getTime() - options.lookbackMs),
		overlapMs: 300_000,
	});
	let queries = 0;
	let occurrences = 0;
	if (!claim?.leaseId)
		return { id, status: "busy" as const, queries, occurrences };
	const leaseId = claim.leaseId;
	let checkpoint = claim.checkpoint;
	const checkBudget = () => {
		if (options.now().getTime() - started.getTime() >= options.maxDurationMs)
			throw new Error("Budget exceeded");
	};
	try {
		while (queries < options.maxQueries) {
			checkBudget();
			const pending = resumeVercelQueryWindows(checkpoint);
			const current = pending[0];
			if (!current) throw new Error("Missing Vercel query window");
			const page = await read({
				since: new Date(current[0]),
				until: new Date(current[1]),
				limit: options.limit,
			});
			queries++;
			for (const intake of page.intakes) {
				checkBudget();
				await ingestReliabilityOccurrence(db, intake);
				occurrences++;
			}
			const nextCursor = advanceVercelQueryWindows(pending, page.saturated);
			if (
				!(await recordReliabilityCursorPage(db, {
					id,
					leaseId,
					now: options.now(),
					expectedPage: checkpoint.page,
					nextCursor,
				}))
			)
				return { id, status: "lease_lost" as const, queries, occurrences };
			if (nextCursor === null)
				return { id, status: "complete" as const, queries, occurrences };
			checkpoint = {
				...checkpoint,
				cursor: nextCursor,
				page: checkpoint.page + 1,
			};
		}
		throw new Error("Budget exceeded");
	} catch {
		const now = options.now();
		const deferred = await deferReliabilityCursor(db, {
			id,
			leaseId,
			now,
			retryAt: new Date(now.getTime() + 60_000),
			errorCode: "VERCEL_RECONCILIATION_INCOMPLETE",
		});
		return {
			id,
			status: deferred ? ("deferred" as const) : ("lease_lost" as const),
			queries,
			occurrences,
		};
	}
}
