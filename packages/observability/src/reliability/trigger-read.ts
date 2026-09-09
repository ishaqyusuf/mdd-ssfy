import { type TriggerRunSource, prepareTriggerRun } from "./trigger-run";

export type TriggerReadSource = TriggerRunSource & { token: string };
type HttpRead = (url: URL, init: RequestInit) => Promise<Response>;
export class TriggerReadError extends Error {
	constructor(
		readonly code: string,
		readonly retryAfterMs = 60_000,
	) {
		super(code);
	}
}

async function read(source: TriggerReadSource, url: URL, request: HttpRead) {
	if (!source.token.startsWith("tr_prod_"))
		throw new TriggerReadError("TRIGGER_CONFIGURATION_INVALID");
	const response = await request(url, {
		headers: {
			authorization: `Bearer ${source.token}`,
			accept: "application/json",
		},
		redirect: "error",
		signal: AbortSignal.timeout(5000),
	});
	if (!response.ok) {
		const seconds = Number(response.headers.get("retry-after"));
		await response.body?.cancel();
		throw new TriggerReadError(
			response.status === 429 ? "TRIGGER_RATE_LIMITED" : "TRIGGER_READ_FAILED",
			seconds > 0 && Number.isFinite(seconds)
				? Math.min(seconds * 1000, 86_400_000)
				: 60_000,
		);
	}
	const reader = response.body?.getReader();
	if (!reader) throw new TriggerReadError("TRIGGER_RESPONSE_INVALID");
	let bytes = 0;
	const chunks: Uint8Array[] = [];
	try {
		while (true) {
			const part = await reader.read();
			if (part.done) break;
			bytes += part.value.byteLength;
			if (bytes > 2_097_152) {
				await reader.cancel();
				throw new TriggerReadError("TRIGGER_RESPONSE_TOO_LARGE");
			}
			chunks.push(part.value);
		}
	} finally {
		reader.releaseLock();
	}
	return JSON.parse(
		new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
	) as unknown;
}

export async function fetchTriggerRunPage(
	source: TriggerReadSource,
	window: { windowStart: string; windowEnd: string; cursor: string | null },
	now: Date,
	request: HttpRead = fetch,
) {
	const start = Date.parse(window.windowStart);
	const end = Date.parse(window.windowEnd);
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		start >= end ||
		!Number.isFinite(now.getTime()) ||
		end > now.getTime()
	)
		throw new TriggerReadError("TRIGGER_WINDOW_INVALID");
	const url = new URL("https://api.trigger.dev/api/v1/runs");
	url.searchParams.set("page[size]", "100");
	url.searchParams.set("filter[isTest]", "false");
	url.searchParams.set("filter[createdAt][from]", String(start));
	url.searchParams.set("filter[createdAt][to]", String(end));
	if (window.cursor !== null)
		url.searchParams.set("page[after]", window.cursor);
	const data = await read(source, url, request);
	if (
		!data ||
		typeof data !== "object" ||
		!("data" in data) ||
		!Array.isArray(data.data) ||
		data.data.length > 100
	)
		throw new TriggerReadError("TRIGGER_RESPONSE_INVALID");
	if (
		!("pagination" in data) ||
		!data.pagination ||
		typeof data.pagination !== "object" ||
		Array.isArray(data.pagination)
	)
		throw new TriggerReadError("TRIGGER_PAGINATION_INVALID");
	const next = "next" in data.pagination ? data.pagination.next : null;
	if (
		next !== null &&
		next !== undefined &&
		(typeof next !== "string" ||
			!/^run_[A-Za-z0-9_-]{1,150}$/.test(next) ||
			next === window.cursor)
	)
		throw new TriggerReadError("TRIGGER_PAGINATION_INVALID");
	const runs = data.data.map((run) =>
		prepareTriggerRun(run, source, now, { discovery: true }),
	);
	if (
		runs.some(
			(run) =>
				run.providerCreatedAt.getTime() < start ||
				run.providerCreatedAt.getTime() > end,
		)
	)
		throw new TriggerReadError("TRIGGER_RUN_OUTSIDE_WINDOW");
	return { runs, nextCursor: typeof next === "string" ? next : null };
}

export async function fetchWatchedTriggerRun(
	source: TriggerReadSource,
	runId: string,
	now: Date,
	request: HttpRead = fetch,
) {
	if (!/^run_[A-Za-z0-9_-]{1,150}$/.test(runId))
		throw new TriggerReadError("TRIGGER_RUN_ID_INVALID");
	const data = await read(
		source,
		new URL(`https://api.trigger.dev/api/v3/runs/${runId}`),
		request,
	);
	return prepareTriggerRun(data, source, now, { expectedRunId: runId });
}
