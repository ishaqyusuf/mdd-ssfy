import { describe, expect, it } from "bun:test";
import { getTrpcPublicError, normalizeTrpcError } from "./error-contract";

describe("tRPC error contract", () => {
	it("turns Prisma transaction timeouts into a safe retryable error", () => {
		const error = Object.assign(
			new Error(
				"Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction.",
			),
			{ code: "P2028", name: "PrismaClientKnownRequestError" },
		);

		const normalized = normalizeTrpcError(error, "sales.create");
		const publicError = getTrpcPublicError(normalized);

		expect(normalized.code).toBe("INTERNAL_SERVER_ERROR");
		expect(normalized.message).not.toContain("Prisma");
		expect(normalized.message).not.toContain("Transaction API");
		expect(publicError.code).toBe("DATABASE_TRANSACTION_TIMEOUT");
		expect(publicError.retryable).toBe(true);
		expect(publicError.referenceId).toMatch(/^ERR-/);
	});

	it("uses canonical copy for untyped client messages", () => {
		const normalized = normalizeTrpcError(
			Object.assign(new Error("This invoice has already been paid."), {
				code: "CONFLICT",
				name: "TRPCError",
			}),
			"invoice.pay",
		);

		expect(normalized.code).toBe("CONFLICT");
		expect(normalized.message).toBe(
			"This record changed before your request completed. Refresh and try again.",
		);
		expect(getTrpcPublicError(normalized).code).toBe("CONFLICT");
	});

	it("suppresses technical messages even when they use a client status", () => {
		const normalized = normalizeTrpcError(
			Object.assign(new Error("Prisma P2002 unique constraint failed"), {
				code: "CONFLICT",
				name: "TRPCError",
			}),
			"customer.create",
		);

		expect(normalized.message).toBe(
			"This record changed before your request completed. Refresh and try again.",
		);
	});
});
