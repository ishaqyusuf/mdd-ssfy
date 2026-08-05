import { describe, expect, it } from "bun:test";
import { AppError } from "@gnd/errors";
import { buildErrorReport, getReportableError, shouldReportError } from ".";

describe("error report contract", () => {
	it("builds a bounded diagnostic context", () => {
		const cause = Object.assign(new Error("transaction expired"), {
			code: "P2028",
		});
		const report = buildErrorReport(cause, {
			extra: {
				attempt: 2,
				customerEmail: "private@example.com",
				paymentId: "secret-payment",
				runId: "run-123",
			},
			operation: "sales.save",
			requestId: "request-123",
			runtime: "api",
			source: "trpc",
			tags: {
				procedure: "sales.save",
				userEmail: "private@example.com",
			},
		});

		expect(report.classified.code).toBe("DATABASE_TRANSACTION_TIMEOUT");
		expect(report.captureContext).toEqual({
			extra: {
				attempt: 2,
				runId: "run-123",
			},
			fingerprint: ["DATABASE_TRANSACTION_TIMEOUT", "sales.save"],
			level: "error",
			tags: {
				error_category: "database",
				error_code: "DATABASE_TRANSACTION_TIMEOUT",
				error_reference: report.classified.referenceId,
				operation: "sales.save",
				procedure: "sales.save",
				request_id: "request-123",
				retryable: "true",
				runtime: "api",
				source: "trpc",
			},
		});
	});

	it("unwraps typed errors to their original cause for stack fidelity", () => {
		const cause = new Error("provider failed");
		const error = new AppError({
			cause,
			code: "PROVIDER_UNAVAILABLE",
		});

		expect(getReportableError(error)).toBe(cause);
	});

	it("does not report expected validation failures", () => {
		const error = new AppError({ code: "VALIDATION_FAILED" });
		expect(shouldReportError(error)).toBe(false);
	});
});
