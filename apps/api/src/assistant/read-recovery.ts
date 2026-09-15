function field(value: unknown, key: string): unknown {
	try { return value && typeof value === "object" ? Reflect.get(value, key) : undefined; }
	catch { return undefined; }
}

/** Only explicit transient failures qualify; arbitrary exception text never does. */
export function assistantReadRetryDelay(error: unknown, now = Date.now()): number | null {
	const status = field(error, "statusCode") ?? field(error, "status");
	if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) return null;
	if (field(error, "name") === "AbortError") return null;
	const code = field(error, "code");
	if (![429, 502, 503, 504].includes(Number(status)) &&
		!(typeof code === "string" && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "P1001", "P1002", "P2024"].includes(code))) return null;
	const headers = field(error, "responseHeaders");
	const retryAfter = headers instanceof Headers ? headers.get("retry-after") ?? undefined : field(headers, "retry-after") ?? field(headers, "Retry-After");
	if (retryAfter === undefined) return 100;
	if (typeof retryAfter !== "string" || retryAfter.length > 100) return null;
	const delay = /^\d+(?:\.\d+)?$/.test(retryAfter)
		? Number(retryAfter) * 1_000 : Date.parse(retryAfter) - now;
	// Do not shorten the server's requested wait to fit our foreground budget.
	return Number.isFinite(delay) && delay <= 1_000 ? Math.max(0, delay) : null;
}

function waitForRetry(ms: number, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) { reject(signal.reason); return; }
		const finish = () => { signal.removeEventListener("abort", abort); resolve(); };
		const timer = setTimeout(finish, ms);
		const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(signal.reason); };
		signal.addEventListener("abort", abort, { once: true });
	});
}

/** One shared retry budget for a request-owned MCP session, not one per tool. */
export function createAssistantReadRecovery() {
	let retryUsed = false;
	return async function recover<T>(input: {
		effect: string;
		signal: AbortSignal;
		operation: (attempt: 1 | 2) => Promise<T>;
		onRetry: (error: unknown) => Promise<void>;
	}): Promise<T> {
		input.signal.throwIfAborted();
		try { return await input.operation(1); }
		catch (error) {
			if (input.signal.aborted || input.effect !== "read" || retryUsed) throw error;
			const delay = assistantReadRetryDelay(error);
			if (delay === null) throw error;
			retryUsed = true;
			try { await input.onRetry(error); } catch { /* Capture cannot prevent recovery. */ }
			await waitForRetry(delay, input.signal);
			input.signal.throwIfAborted();
			return input.operation(2);
		}
	};
}
