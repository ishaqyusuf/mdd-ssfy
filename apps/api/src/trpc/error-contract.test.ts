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

it("preserves a reportable sales integrity reason and reference through transport", async () => {
	const { AppError } = await import("@gnd/errors");
	const { buildErrorReport } = await import("@gnd/observability");
	const error = new AppError({
		code: "SALES_RELATIONAL_REVIEW_REQUIRED",
		referenceId: "ERR-SALES-REVIEW",
		internalMessage: "Internal projection details",
	});
	const normalized = normalizeTrpcError(error, "newSalesForm.saveFinal");
	const envelope = getTrpcPublicError(normalized);
	const report = buildErrorReport(normalized, {
		runtime: "api",
		source: "trpc",
		operation: "newSalesForm.saveFinal",
	});
	expect(normalized.code).toBe("PRECONDITION_FAILED");
	expect(envelope.code).toBe("SALES_RELATIONAL_REVIEW_REQUIRED");
	expect(envelope.message).toContain("previously approved change");
	expect(envelope.message).not.toContain("Internal projection details");
	expect(envelope.retryable).toBe(false);
	expect(report.classified.reportable).toBe(true);
	expect(report.captureContext.tags.error_reference).toBe(envelope.referenceId);
	expect(envelope.referenceId).toBe("ERR-SALES-REVIEW");
});
