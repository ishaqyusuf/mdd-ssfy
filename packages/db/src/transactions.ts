import { classifyError } from "@gnd/errors";
import type { Database, TransactionClient } from "./index";

export const DB_TRANSACTION_PROFILES = {
	short: { maxWait: 2_000, timeout: 5_000 },
	standard: { maxWait: 5_000, timeout: 15_000 },
	workflow: { maxWait: 10_000, timeout: 30_000 },
} as const;

export const DEFAULT_DB_TRANSACTION_OPTIONS = DB_TRANSACTION_PROFILES.standard;

export type DbTransactionProfile = keyof typeof DB_TRANSACTION_PROFILES;

export type RunDbTransactionOptions = {
	client: Database;
	operation: string;
	profile?: DbTransactionProfile;
	retryOnWriteConflict?: boolean;
};

/**
 * Runs a database-only callback with explicit wait/execution limits.
 * Keep network calls, file work, and other external side effects outside the callback.
 */
export async function runDbTransaction<T>(
	options: RunDbTransactionOptions,
	callback: (transaction: TransactionClient) => Promise<T>,
) {
	const profile = DB_TRANSACTION_PROFILES[options.profile ?? "standard"];
	const maxAttempts = options.retryOnWriteConflict ? 2 : 1;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await options.client.$transaction(callback, profile);
		} catch (error) {
			const classified = classifyError(error, {
				operation: options.operation,
			});
			const shouldRetry =
				classified.code === "DATABASE_WRITE_CONFLICT" && attempt < maxAttempts;
			if (!shouldRetry) throw classified;
		}
	}

	throw classifyError(new Error("Transaction retry budget exhausted"), {
		operation: options.operation,
	});
}
