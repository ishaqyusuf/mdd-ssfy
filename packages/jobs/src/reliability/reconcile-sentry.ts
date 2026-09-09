import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import {
	claimReliabilityCursor,
	deferReliabilityCursor,
	ingestReliabilityOccurrence,
	recordReliabilityCursorPage,
} from "@gnd/db/queries";
import {
	SentryReadError,
	type SentryReadSource,
	fetchSentryErrorPage,
} from "@gnd/observability/reliability";

export async function reconcileSentrySource(
	db: Database,
	source: SentryReadSource,
	options: {
		now: () => Date;
		maxPages: number;
		maxDurationMs: number;
		lookbackMs: number;
		mode?: "incremental" | "historical";
	},
	request?: (url: URL, init: RequestInit) => Promise<Response>,
) {
	if (
		!Number.isInteger(options.maxPages) ||
		options.maxPages < 1 ||
		options.maxPages > 20 ||
		!Number.isInteger(options.maxDurationMs) ||
		options.maxDurationMs < 1000 ||
		options.maxDurationMs > 240_000 ||
		!Number.isInteger(options.lookbackMs) ||
		options.lookbackMs < 300_000 ||
		options.lookbackMs > 7 * 86_400_000
	)
		throw new Error("Invalid Sentry reconciliation budget");
	const started = options.now();
	const id = createHash("sha256")
		.update(
			JSON.stringify([
				"sentry-events",
				source.service.id,
				source.account,
				source.projectId,
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
	if (!claim?.leaseId)
		return { id, status: "busy" as const, pages: 0, occurrences: 0 };
	const leaseId = claim.leaseId;
	let checkpoint = claim.checkpoint;
	let pages = 0;
	let occurrences = 0;
	try {
		while (
			pages < options.maxPages &&
			options.now().getTime() - started.getTime() < options.maxDurationMs
		) {
			const page = await fetchSentryErrorPage(source, checkpoint, request);
			for (const intake of page.events) {
				if (
					options.now().getTime() - started.getTime() >=
					options.maxDurationMs
				)
					throw new SentryReadError("RECONCILIATION_BUDGET_EXHAUSTED");
				await ingestReliabilityOccurrence(db, intake);
				occurrences++;
			}
			const committed = await recordReliabilityCursorPage(db, {
				id,
				leaseId,
				now: options.now(),
				expectedPage: checkpoint.page,
				nextCursor: page.nextCursor,
			});
			if (!committed)
				return { id, status: "lease_lost" as const, pages, occurrences };
			pages++;
			if (page.nextCursor === null)
				return { id, status: "complete" as const, pages, occurrences };
			checkpoint = {
				...checkpoint,
				cursor: page.nextCursor,
				page: checkpoint.page + 1,
			};
		}
		throw new SentryReadError("RECONCILIATION_BUDGET_EXHAUSTED");
	} catch (error) {
		const code =
			error instanceof SentryReadError ? error.code : "RECONCILIATION_FAILED";
		const now = options.now();
		const deferred = await deferReliabilityCursor(db, {
			id,
			leaseId,
			now,
			retryAt: new Date(
				now.getTime() +
					(error instanceof SentryReadError ? error.retryAfterMs : 60_000),
			),
			errorCode: code,
		});
		return {
			id,
			status: deferred ? ("deferred" as const) : ("lease_lost" as const),
			code,
			pages,
			occurrences,
		};
	}
}
