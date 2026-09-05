export function isRetryableDatabaseConnectionError(error: unknown) {
	const value = error as { code?: unknown; message?: unknown };
	const message = typeof value?.message === "string" ? value.message : "";
	return (
		value?.code === "GND_DATABASE_READ_TIMEOUT" ||
		value?.code === "P1001" ||
		value?.code === "P1017" ||
		value?.code === "P2024" ||
		message.includes("Can't reach database server") ||
		message.includes("Server has closed the connection") ||
		message.includes("Response from the Engine was empty") ||
		message.includes("Engine is not yet connected") ||
		message.includes(
			"Timed out fetching a new connection from the connection pool",
		)
	);
}

export type DatabaseRetryOptions = {
	attempts?: number;
	delayMs?: number;
	attemptTimeoutMs?: number;
	onRetry?: (error: unknown, attempt: number) => Promise<void> | void;
};

export async function runDatabaseCli(
	run: () => Promise<void>,
	disconnect: () => Promise<void>,
	cleanupTimeoutMs = 5_000,
) {
	try {
		await run();
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	} finally {
		try {
			// No deadline covers run(): all domain writes and report writes must settle first.
			await withDatabaseAttemptTimeout(disconnect, cleanupTimeoutMs, "cleanup");
		} catch (error) {
			console.error(error);
			process.exitCode = 1;
		}
		// Retired clients can also retain handles after the final client closes.
		// Flush the completed report and terminate only after main has settled.
		await Promise.all([
			new Promise<void>((resolve) => process.stdout.write("", () => resolve())),
			new Promise<void>((resolve) => process.stderr.write("", () => resolve())),
		]);
		process.exit(process.exitCode ?? 0);
	}
}

function databaseReadTimeoutError(timeoutMs: number) {
	return Object.assign(
		new Error(`Database read attempt timed out after ${timeoutMs}ms.`),
		{ code: "GND_DATABASE_READ_TIMEOUT" },
	);
}

async function withDatabaseAttemptTimeout<T>(
	operation: () => Promise<T>,
	timeoutMs: number,
	phase: "read" | "cleanup" = "read",
) {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation(),
			new Promise<never>((_resolve, reject) => {
				timeout = setTimeout(
					() => reject(phase === "read" ? databaseReadTimeoutError(timeoutMs) : new Error(`Database cleanup timed out after ${timeoutMs}ms.`)),
					timeoutMs,
				);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

export async function withDatabaseReadRetry<T>(
	operation: () => Promise<T>,
	options: DatabaseRetryOptions = {},
) {
	const attempts = Math.max(1, options.attempts ?? 20);
	const delayMs = Math.max(0, options.delayMs ?? 5_000);
	const attemptTimeoutMs = Math.max(1, options.attemptTimeoutMs ?? 30_000);
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await withDatabaseAttemptTimeout(operation, attemptTimeoutMs);
		} catch (error) {
			if (attempt === attempts || !isRetryableDatabaseConnectionError(error)) {
				throw error;
			}
			// Cleanup can hang on the same failed driver. Bound recovery too; if
			// it times out, fail closed without starting another operation.
			await withDatabaseAttemptTimeout(
				async () => options.onRetry?.(error, attempt),
				attemptTimeoutMs,
			);
			await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
		}
	}
	throw new Error("Database read retry exhausted unexpectedly.");
}

export async function withDeterministicProjectionRepairRetry<T>(
	operation: () => Promise<T>,
	options: DatabaseRetryOptions = {},
) {
	const attempts = Math.max(1, options.attempts ?? 20);
	const delayMs = Math.max(0, options.delayMs ?? 5_000);
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			// A read deadline does not cancel a write. Wait for settlement before
			// recomputing this idempotent, revision-guarded projection batch.
			return await operation();
		} catch (error) {
			if (
				attempt === attempts ||
				!isRetryableDatabaseConnectionError(error) ||
				(error as { code?: unknown })?.code === "GND_DATABASE_READ_TIMEOUT"
			) {
				throw error;
			}
			await options.onRetry?.(error, attempt);
			await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
		}
	}
	throw new Error("Projection repair retry exhausted unexpectedly.");
}
