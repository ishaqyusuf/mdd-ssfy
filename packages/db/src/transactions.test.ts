// @ts-ignore -- the production DB config omits Bun globals; the dedicated test config loads them.
import { describe, expect, it, mock } from "bun:test";
import { AppError } from "@gnd/errors";
import type { Database, TransactionClient } from "./index";
import { runDbTransaction } from "./transactions";

function clientWithTransaction(transaction: unknown) {
	return { $transaction: transaction } as unknown as Database;
}

describe("governed database transactions", () => {
	it("applies an explicit timeout profile", async () => {
		const callback = mock(async () => "saved");
		const transaction = mock(
			async (
				run: (tx: TransactionClient) => Promise<unknown>,
				options: { maxWait: number; timeout: number },
			) => {
				expect(options).toEqual({ maxWait: 5_000, timeout: 15_000 });
				return run({} as TransactionClient);
			},
		);

		const result = await runDbTransaction(
			{
				client: clientWithTransaction(transaction),
				operation: "sales.save",
				profile: "standard",
			},
			callback,
		);

		expect(result).toBe("saved");
		expect(transaction).toHaveBeenCalledTimes(1);
	});

	it("classifies a terminal Prisma timeout with the transaction operation", async () => {
		const transaction = mock(async () => {
			throw Object.assign(new Error("Transaction expired"), { code: "P2028" });
		});

		try {
			await runDbTransaction(
				{
					client: clientWithTransaction(transaction),
					operation: "sales.submit-production",
				},
				async () => undefined,
			);
			throw new Error("Expected transaction to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect(error).toMatchObject({
				code: "DATABASE_TRANSACTION_TIMEOUT",
				operation: "sales.submit-production",
			});
		}
	});

	it("retries write conflicts only when explicitly enabled", async () => {
		const transaction = mock()
			.mockRejectedValueOnce(
				Object.assign(new Error("Write conflict"), { code: "P2034" }),
			)
			.mockImplementationOnce(
				async (run: (tx: TransactionClient) => Promise<unknown>) =>
					run({} as TransactionClient),
			);

		await runDbTransaction(
			{
				client: clientWithTransaction(transaction),
				operation: "inventory.allocate",
				retryOnWriteConflict: true,
			},
			async () => "allocated",
		);

		expect(transaction).toHaveBeenCalledTimes(2);
	});
});
