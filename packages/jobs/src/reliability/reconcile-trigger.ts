import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import {
	claimReliabilityCursor,
	deferReliabilityCursor,
	deferTriggerWatch,
	getDueTriggerWatches,
	recordReliabilityCursorPage,
	recordTriggerRunObservation,
} from "@gnd/db/queries";
import {
	TriggerReadError,
	type TriggerReadSource,
	fetchTriggerRunPage,
	fetchWatchedTriggerRun,
} from "@gnd/observability/reliability";

export async function reconcileTriggerSource(
	db: Database,
	source: TriggerReadSource,
	options: {
		now: () => Date;
		maxPages: number;
		maxWatches: number;
		maxDurationMs: number;
		lookbackMs: number;
		mode?: "incremental" | "historical";
	},
	request?: (url: URL, init: RequestInit) => Promise<Response>,
) {
	for (const [value, min, max] of [
		[options.maxPages, 1, 20],
		[options.maxWatches, 1, 100],
		[options.maxDurationMs, 1000, 240_000],
		[options.lookbackMs, 300_000, 7 * 86_400_000],
	] as const) {
		if (!Number.isInteger(value) || value < min || value > max)
			throw new Error("Invalid Trigger reconciliation budget");
	}
	const started = options.now();
	const id = createHash("sha256")
		.update(
			JSON.stringify([
				"trigger-runs",
				source.service.id,
				source.account,
				source.project,
				"production",
				...(options.mode === "historical" ? ["historical"] : []),
			]),
		)
		.digest("hex");
	const claim = await claimReliabilityCursor(db, {
		id,
		now: started,
		leaseMs: options.maxDurationMs + 30_000,
		initialWindowStart: new Date(started.getTime() - options.lookbackMs),
		overlapMs: 300_000,
		replayWindow: options.mode === "historical",
	});
	let pages = 0;
	let runs = 0;
	let watchFailures = 0;
	if (!claim?.leaseId)
		return { id, status: "busy" as const, pages, runs, watchFailures };
	const leaseId = claim.leaseId;
	let checkpoint = claim.checkpoint;
	const checkBudget = () => {
		if (options.now().getTime() - started.getTime() >= options.maxDurationMs)
			throw new TriggerReadError("RECONCILIATION_BUDGET_EXHAUSTED");
	};
	try {
		const watches =
			options.mode === "historical"
				? []
				: await getDueTriggerWatches(db, source, {
						now: options.now(),
						limit: options.maxWatches,
					});
		for (const watch of watches) {
			// Leave half the processing window for discovery. Unvisited watches
			// retain their due time and lead the next poll's ordered watch batch.
			if (
				options.now().getTime() - started.getTime() >=
				options.maxDurationMs / 2
			)
				break;
			checkBudget();
			let observed: Awaited<ReturnType<typeof fetchWatchedTriggerRun>>;
			try {
				observed = await fetchWatchedTriggerRun(
					source,
					watch.runId,
					options.now(),
					request,
				);
			} catch (error) {
				if (
					error instanceof TriggerReadError &&
					error.code === "TRIGGER_RATE_LIMITED"
				)
					throw error;
				const now = options.now();
				await deferTriggerWatch(db, {
					watchKey: watch.watchKey,
					expectedUpdatedAt: watch.providerUpdatedAt,
					now,
					retryAt: new Date(now.getTime() + 300_000),
				});
				watchFailures++;
				continue;
			}
			checkBudget();
			await recordTriggerRunObservation(db, observed, options.now());
			runs++;
		}
		while (pages < options.maxPages) {
			checkBudget();
			const page = await fetchTriggerRunPage(
				source,
				checkpoint,
				options.now(),
				request,
			);
			for (const run of page.runs) {
				checkBudget();
				await recordTriggerRunObservation(db, run, options.now());
				runs++;
			}
			const committed = await recordReliabilityCursorPage(db, {
				id,
				leaseId,
				now: options.now(),
				expectedPage: checkpoint.page,
				nextCursor: page.nextCursor,
			});
			if (!committed)
				return {
					id,
					status: "lease_lost" as const,
					pages,
					runs,
					watchFailures,
				};
			pages++;
			if (page.nextCursor === null)
				return {
					id,
					status: watchFailures
						? ("attention_required" as const)
						: ("complete" as const),
					pages,
					runs,
					watchFailures,
				};
			checkpoint = {
				...checkpoint,
				cursor: page.nextCursor,
				page: checkpoint.page + 1,
			};
		}
		throw new TriggerReadError("RECONCILIATION_BUDGET_EXHAUSTED");
	} catch (error) {
		const code =
			error instanceof TriggerReadError ? error.code : "RECONCILIATION_FAILED";
		const now = options.now();
		const deferred = await deferReliabilityCursor(db, {
			id,
			leaseId,
			now,
			retryAt: new Date(
				now.getTime() +
					(error instanceof TriggerReadError ? error.retryAfterMs : 60_000),
			),
			errorCode: code,
		});
		return {
			id,
			status: deferred ? ("deferred" as const) : ("lease_lost" as const),
			code,
			pages,
			runs,
			watchFailures,
		};
	}
}
