import { type ReliabilityService, prepareIncidentIntake } from "./intake";

export type SentryReadSource = {
	account: string;
	projectId: string;
	apiOrigin: string;
	token: string;
	operation: string;
	service: ReliabilityService;
};
export type SentryReadWindow = {
	windowStart: string;
	windowEnd: string;
	cursor: string | null;
};
export class SentryReadError extends Error {
	constructor(
		readonly code: string,
		readonly retryAfterMs = 60_000,
	) {
		super(code);
	}
}

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new SentryReadError("SENTRY_EVENT_INVALID");
	return value as Record<string, unknown>;
}

export async function fetchSentryErrorPage(
	source: SentryReadSource,
	window: SentryReadWindow,
	request: (url: URL, init: RequestInit) => Promise<Response> = fetch,
) {
	if (
		![
			"https://sentry.io",
			"https://us.sentry.io",
			"https://de.sentry.io",
		].includes(source.apiOrigin) ||
		!source.token ||
		!/^[A-Za-z0-9_-]+$/.test(source.account) ||
		!/^[A-Za-z0-9_-]+$/.test(source.projectId)
	)
		throw new SentryReadError("SENTRY_CONFIGURATION_INVALID");
	const start = new Date(window.windowStart);
	const end = new Date(window.windowEnd);
	if (
		!Number.isFinite(start.getTime()) ||
		!Number.isFinite(end.getTime()) ||
		start >= end
	)
		throw new SentryReadError("SENTRY_WINDOW_INVALID");
	const url = new URL(
		`/api/0/projects/${source.account}/${source.projectId}/events/`,
		source.apiOrigin,
	);
	url.searchParams.set("start", window.windowStart);
	url.searchParams.set("end", window.windowEnd);
	url.searchParams.set("full", "false");
	url.searchParams.set("sample", "false");
	if (window.cursor !== null) url.searchParams.set("cursor", window.cursor);
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
		throw new SentryReadError(
			response.status === 429 ? "SENTRY_RATE_LIMITED" : "SENTRY_READ_FAILED",
			Number.isFinite(seconds) && seconds > 0
				? Math.min(seconds * 1000, 86_400_000)
				: 60_000,
		);
	}
	const link = response.headers
		.get("link")
		?.split(",")
		.find((part) => /rel="next"/.test(part));
	const match = link?.match(/<([^>]+)>/);
	if (!link || !match?.[1] || !/results="(true|false)"/.test(link)) {
		await response.body?.cancel();
		throw new SentryReadError("SENTRY_PAGINATION_INVALID");
	}
	const next = new URL(match[1]);
	if (next.origin !== url.origin || next.pathname !== url.pathname) {
		await response.body?.cancel();
		throw new SentryReadError("SENTRY_PAGINATION_INVALID");
	}
	const nextCursor = /results="true"/.test(link)
		? next.searchParams.get("cursor")
		: null;
	if (
		/results="true"/.test(link) &&
		(!nextCursor || nextCursor.length > 2048 || nextCursor === window.cursor)
	) {
		await response.body?.cancel();
		throw new SentryReadError("SENTRY_PAGINATION_INVALID");
	}
	const reader = response.body?.getReader();
	if (!reader) throw new SentryReadError("SENTRY_RESPONSE_INVALID");
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const part = await reader.read();
			if (part.done) break;
			bytes += part.value.byteLength;
			if (bytes > 2_097_152) {
				await reader.cancel();
				throw new SentryReadError("SENTRY_RESPONSE_TOO_LARGE");
			}
			chunks.push(part.value);
		}
	} finally {
		reader.releaseLock();
	}
	const payload: unknown = JSON.parse(
		new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
	);
	if (!Array.isArray(payload) || payload.length > 100)
		throw new SentryReadError("SENTRY_RESPONSE_INVALID");
	const events = payload.flatMap((value) => {
		const event = record(value);
		if (String(event.projectID) !== source.projectId)
			throw new SentryReadError("SENTRY_PROJECT_MISMATCH");
		const environments = Array.isArray(event.tags)
			? event.tags
					.map(record)
					.filter((tag) => tag.key === "environment")
					.map((tag) => tag.value)
			: [];
		if (
			!environments.length ||
			environments.some(
				(environment) => typeof environment !== "string" || environment === "",
			)
		)
			throw new SentryReadError("SENTRY_ENVIRONMENT_MISSING");
		if (new Set(environments).size !== 1)
			throw new SentryReadError("SENTRY_ENVIRONMENT_CONFLICT");
		if (environments[0] !== "production") return [];
		if (typeof event.dateCreated !== "string")
			throw new SentryReadError("SENTRY_EVENT_INVALID");
		const occurredAt = event.dateCreated.replace(
			/\.(\d{1,6})Z$/,
			(_, fraction: string) => `.${fraction.padEnd(3, "0").slice(0, 3)}Z`,
		);
		const intake = prepareIncidentIntake(
			{
				provider: "sentry",
				account: source.account,
				project: source.projectId,
				environment: "production",
				eventId: event.eventID,
				groupId: event.groupID,
				operation: source.operation,
				impact: "unknown",
				occurredAt,
			},
			source.service,
			end,
		);
		if (
			new Date(intake.occurrence.occurredAt) < start ||
			new Date(intake.occurrence.occurredAt) > end
		)
			throw new SentryReadError("SENTRY_EVENT_OUTSIDE_WINDOW");
		return [intake];
	});
	return { events, nextCursor };
}
