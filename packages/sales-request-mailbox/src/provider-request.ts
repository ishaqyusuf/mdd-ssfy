import type { MailboxProvider } from "./contracts.js";
import { MailboxProviderError } from "./errors.js";

export const MAILBOX_PROVIDER_REQUEST_TIMEOUT_MS = 30_000;
export const MAILBOX_PROVIDER_REVOKE_TIMEOUT_MS = 15_000;
export const MAILBOX_PROVIDER_DEADLINE_RESERVE_MS = 250;
const MAX_TIMEOUT_MS = 15 * 60_000;

export type MailboxProviderRequestAbortReason =
	| "caller-cancelled"
	| "lease-expired"
	| "attempt-expired";
type InternalAbortReason =
	| MailboxProviderRequestAbortReason
	| "request-timeout";

const ABORT_MARKER = Symbol("mailbox-provider-request-abort");
type AbortMarker = {
	readonly [ABORT_MARKER]: true;
	readonly reason: InternalAbortReason;
};

export class MailboxProviderRequestAbort extends Error {
	readonly provider: MailboxProvider;
	readonly reason: MailboxProviderRequestAbortReason;

	constructor(input: {
		provider: MailboxProvider;
		reason: MailboxProviderRequestAbortReason;
	}) {
		super("Mailbox provider request was cancelled");
		this.name = "MailboxProviderRequestAbort";
		this.provider = input.provider;
		this.reason = input.reason;
	}
}

export type MailboxProviderRequestTimeoutKind =
	| "request-timeout"
	| "lease-expired"
	| "attempt-expired";

function marker(reason: InternalAbortReason): AbortMarker {
	return { [ABORT_MARKER]: true, reason } as AbortMarker;
}

function markedReason(value: unknown): InternalAbortReason | null {
	if (
		typeof value !== "object" ||
		value === null ||
		(value as AbortMarker)[ABORT_MARKER] !== true
	) {
		return null;
	}
	const reason = (value as AbortMarker).reason;
	return reason === "caller-cancelled" ||
		reason === "lease-expired" ||
		reason === "attempt-expired" ||
		reason === "request-timeout"
		? reason
		: null;
}

function safeSignalReason(
	signal: AbortSignal | undefined,
): InternalAbortReason {
	return markedReason(signal?.reason) ?? "caller-cancelled";
}

function requestAbort(provider: MailboxProvider, reason: InternalAbortReason) {
	return reason === "request-timeout"
		? new MailboxProviderError({
				provider,
				code: "network",
				requestFailure: "request-timeout",
			})
		: new MailboxProviderRequestAbort({ provider, reason });
}

function validPositiveDuration(value: number) {
	return Number.isSafeInteger(value) && value > 0 && value <= MAX_TIMEOUT_MS;
}

/**
 * Owns one finite deadline for a complete provider operation. Nested adapter
 * requests receive the same signal; they must not create a fresh timeout per fetch.
 */
export async function runMailboxProviderRequest<T>(input: {
	provider: MailboxProvider;
	request: (signal: AbortSignal) => Promise<T>;
	signal?: AbortSignal;
	timeoutMs?: number;
	timeoutKind?: MailboxProviderRequestTimeoutKind;
	deadlineAt?: Date;
	deadlineKind?: Exclude<MailboxProviderRequestTimeoutKind, "request-timeout">;
	deadlineReserveMs?: number;
	now?: Date;
}): Promise<T> {
	const timeoutMs = input.timeoutMs ?? MAILBOX_PROVIDER_REQUEST_TIMEOUT_MS;
	const timeoutKind = input.timeoutKind ?? "request-timeout";
	const reserveMs =
		input.deadlineReserveMs ?? MAILBOX_PROVIDER_DEADLINE_RESERVE_MS;
	const now = input.now ?? new Date();
	if (
		!validPositiveDuration(timeoutMs) ||
		!Number.isSafeInteger(reserveMs) ||
		reserveMs < 0 ||
		reserveMs > MAX_TIMEOUT_MS ||
		!(now instanceof Date) ||
		!Number.isFinite(now.getTime()) ||
		(input.deadlineAt !== undefined &&
			(!(input.deadlineAt instanceof Date) ||
				!Number.isFinite(input.deadlineAt.getTime()))) ||
		typeof input.request !== "function"
	) {
		throw new Error("invalid-mailbox-provider-request");
	}

	const controller = new AbortController();
	let firstReason: InternalAbortReason | null = null;
	let rejectAbort: ((reason: unknown) => void) | undefined;
	const aborted = new Promise<never>((_resolve, reject) => {
		rejectAbort = reject;
	});
	void aborted.catch(() => undefined);
	const abort = (reason: InternalAbortReason) => {
		if (firstReason !== null) return;
		firstReason = reason;
		controller.abort(marker(reason));
		rejectAbort?.(requestAbort(input.provider, reason));
	};
	const onCallerAbort = () => abort(safeSignalReason(input.signal));
	input.signal?.addEventListener("abort", onCallerAbort, { once: true });
	if (input.signal?.aborted) onCallerAbort();

	let timeout: ReturnType<typeof setTimeout> | undefined;
	let deadline: ReturnType<typeof setTimeout> | undefined;
	if (input.deadlineAt) {
		const remaining = input.deadlineAt.getTime() - now.getTime() - reserveMs;
		const reason = input.deadlineKind ?? timeoutKind;
		if (remaining <= 0) abort(reason);
		else if (remaining <= timeoutMs) {
			deadline = setTimeout(() => abort(reason), remaining);
		} else timeout = setTimeout(() => abort(timeoutKind), timeoutMs);
	} else timeout = setTimeout(() => abort(timeoutKind), timeoutMs);

	try {
		if (firstReason) throw requestAbort(input.provider, firstReason);
		const request = input.request(controller.signal);
		return await Promise.race([request, aborted]);
	} catch (error) {
		if (firstReason) throw requestAbort(input.provider, firstReason);
		// A failed operation may still have sibling provider requests in flight.
		// Abort their shared transport signal without replacing the primary failure.
		controller.abort(marker("caller-cancelled"));
		if (
			error instanceof MailboxProviderError ||
			error instanceof MailboxProviderRequestAbort
		) {
			throw error;
		}
		throw error;
	} finally {
		if (!controller.signal.aborted) {
			controller.abort(marker("caller-cancelled"));
		}
		if (timeout) clearTimeout(timeout);
		if (deadline) clearTimeout(deadline);
		input.signal?.removeEventListener("abort", onCallerAbort);
	}
}

export function classifyMailboxProviderTransportError(input: {
	provider: MailboxProvider;
	error: unknown;
	signal?: AbortSignal;
}): MailboxProviderError | MailboxProviderRequestAbort {
	if (
		input.error instanceof MailboxProviderError ||
		input.error instanceof MailboxProviderRequestAbort
	) {
		return input.error;
	}
	if (input.signal?.aborted) {
		return requestAbort(input.provider, safeSignalReason(input.signal));
	}
	return new MailboxProviderError({
		provider: input.provider,
		code: "network",
	});
}

function cancelBody(
	reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
	body: ReadableStream<Uint8Array> | null,
) {
	try {
		const cancellation = reader ? reader.cancel() : body?.cancel();
		void cancellation?.catch(() => undefined);
	} catch {
		// Cleanup must never replace the primary bounded failure.
	}
}

/** Reads a response body with a hard byte ceiling and closes discarded streams. */
export async function readBoundedMailboxProviderResponse(input: {
	provider: MailboxProvider;
	response: Response;
	maxBytes: number;
	signal?: AbortSignal;
}): Promise<Uint8Array> {
	if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 0) {
		throw new Error("invalid-mailbox-provider-response-bound");
	}
	const declared = input.response.headers.get("content-length");
	if (declared && /^\d+$/.test(declared)) {
		const length = Number(declared);
		if (!Number.isSafeInteger(length) || length > input.maxBytes) {
			cancelBody(undefined, input.response.body);
			throw new MailboxProviderError({
				provider: input.provider,
				code: "malformed-response",
			});
		}
	}
	if (input.signal?.aborted) {
		cancelBody(undefined, input.response.body);
		throw requestAbort(input.provider, safeSignalReason(input.signal));
	}
	if (!input.response.body) return new Uint8Array();

	const reader = input.response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	let completed = false;
	let rejectAbort: ((reason: unknown) => void) | undefined;
	const aborted = new Promise<never>((_resolve, reject) => {
		rejectAbort = reject;
	});
	const onAbort = () => {
		const error = requestAbort(input.provider, safeSignalReason(input.signal));
		rejectAbort?.(error);
		cancelBody(reader, null);
	};
	input.signal?.addEventListener("abort", onAbort, { once: true });
	if (input.signal?.aborted) onAbort();

	try {
		while (true) {
			const result = input.signal
				? await Promise.race([reader.read(), aborted])
				: await reader.read();
			if (result.done) break;
			total += result.value.byteLength;
			if (total > input.maxBytes) {
				throw new MailboxProviderError({
					provider: input.provider,
					code: "malformed-response",
				});
			}
			chunks.push(result.value);
		}
		completed = true;
		const bytes = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return bytes;
	} catch (error) {
		if (
			error instanceof MailboxProviderError ||
			error instanceof MailboxProviderRequestAbort
		) {
			throw error;
		}
		throw classifyMailboxProviderTransportError({
			provider: input.provider,
			error,
			signal: input.signal,
		});
	} finally {
		input.signal?.removeEventListener("abort", onAbort);
		if (!completed) cancelBody(reader, null);
		reader.releaseLock();
	}
}
