import { describe, expect, it } from "bun:test";
import {
	AppError,
	classifyError,
	getErrorPresentation,
	getPublicError,
	getPublicErrorHttpStatus,
	getUserErrorMessage,
	toPublicError,
} from ".";

describe("shared error system", () => {
	it.each([
		["P2028", "DATABASE_TRANSACTION_TIMEOUT", true],
		["P2024", "DATABASE_POOL_TIMEOUT", true],
		["P2034", "DATABASE_WRITE_CONFLICT", true],
		["P2002", "CONFLICT", false],
	] as const)(
		"classifies Prisma %s",
		(prismaCode, expectedCode, expectedReportable) => {
			const error = Object.assign(new Error("Prisma transaction API error"), {
				code: prismaCode,
				name: "PrismaClientKnownRequestError",
			});

			expect(classifyError(error)).toMatchObject({
				code: expectedCode,
				reportable: expectedReportable,
			});
		},
	);

	it("finds a Prisma timeout wrapped by infrastructure code", () => {
		const prismaError = Object.assign(new Error("Transaction expired"), {
			code: "P2028",
		});
		const wrapped = new Error("Unable to save order", { cause: prismaError });

		expect(classifyError(wrapped)).toMatchObject({
			code: "DATABASE_TRANSACTION_TIMEOUT",
			reportable: true,
		});
	});

	it("treats schema validation failures as expected", () => {
		const error = Object.assign(new Error("Invalid input"), {
			issues: [{ path: ["email"] }],
			name: "ZodError",
		});

		expect(classifyError(error)).toMatchObject({
			code: "VALIDATION_FAILED",
			reportable: false,
		});
	});

	it("keeps database details out of the public envelope", () => {
		const publicError = toPublicError(
			Object.assign(
				new Error(
					"Transaction API error: Transaction already closed: A commit cannot be executed on an expired transaction",
				),
				{ code: "P2028" },
			),
			{ referenceId: "ERR-TEST123" },
		);

		expect(publicError).toEqual({
			action: "retry",
			code: "DATABASE_TRANSACTION_TIMEOUT",
			message:
				"We couldn't complete this action because the system took too long. Please try again.",
			referenceId: "ERR-TEST123",
			retryable: true,
		});
		expect(JSON.stringify(publicError)).not.toContain("Transaction API");
	});

	it("does not trust raw tRPC messages as public copy", () => {
		const error = Object.assign(
			new Error("This order was updated elsewhere."),
			{
				code: "CONFLICT",
				name: "TRPCError",
			},
		);

		expect(toPublicError(error, { referenceId: "ERR-CONFLICT" })).toEqual({
			action: "refresh",
			code: "CONFLICT",
			message:
				"This record changed before your request completed. Refresh and try again.",
			referenceId: "ERR-CONFLICT",
			retryable: false,
		});
		expect(classifyError(error).reportable).toBe(false);
	});

	it("replaces technical tRPC messages even when their transport code is expected", () => {
		const error = Object.assign(
			new Error(
				"Prisma transaction P2028 timed out while updating SalesOrders",
			),
			{
				code: "CONFLICT",
				name: "TRPCError",
			},
		);

		expect(toPublicError(error).message).toBe(
			"This record changed before your request completed. Refresh and try again.",
		);
		expect(classifyError(error).reportable).toBe(true);
	});

	it("uses typed domain errors without losing their cause or reference", () => {
		const cause = new Error("provider socket reset");
		const error = new AppError({
			cause,
			code: "PROVIDER_UNAVAILABLE",
			publicMessage: "Document delivery is temporarily unavailable.",
			referenceId: "ERR-PROVIDER",
		});

		expect(error.cause).toBe(cause);
		expect(classifyError(error)).toBe(error);
		expect(toPublicError(error)).toEqual({
			action: "retry",
			code: "PROVIDER_UNAVAILABLE",
			message: "Document delivery is temporarily unavailable.",
			referenceId: "ERR-PROVIDER",
			retryable: true,
		});
	});

	it("reads the public envelope from tRPC client errors", () => {
		const publicError = {
			action: "sign_in" as const,
			code: "AUTHENTICATION_REQUIRED" as const,
			message: "Sign in again to continue.",
			referenceId: "ERR-AUTH",
			retryable: false,
		};
		const clientError = Object.assign(new Error("UNAUTHORIZED"), {
			data: { appError: publicError },
		});

		expect(getPublicError(clientError)).toEqual(publicError);
		expect(getUserErrorMessage(clientError)).toBe("Sign in again to continue.");
	});

	it("falls back to professional copy for unknown failures", () => {
		const publicError = getPublicError(new Error("kaboom"), {
			referenceId: "ERR-UNKNOWN",
		});

		expect(publicError).toEqual({
			action: "contact_support",
			code: "UNEXPECTED",
			message: "Something went wrong. Please try again.",
			referenceId: "ERR-UNKNOWN",
			retryable: false,
		});
	});

	it("classifies HTTP errors without exposing technical server messages", () => {
		const missing = Object.assign(new Error("Order was not found."), {
			status: 404,
		});
		const serverFailure = Object.assign(
			new Error("Prisma connection pool failed"),
			{ status: 500 },
		);

		expect(toPublicError(missing)).toMatchObject({
			code: "NOT_FOUND",
			message: "The requested information could not be found.",
		});
		expect(classifyError(missing).reportable).toBe(false);
		expect(toPublicError(serverFailure).message).toBe(
			"Something went wrong. Please try again.",
		);
		expect(getPublicErrorHttpStatus(missing)).toBe(404);
		expect(getPublicErrorHttpStatus(serverFailure)).toBe(500);
	});

	it("builds a consistent user-facing presentation with a support reference", () => {
		const presentation = getErrorPresentation(
			Object.assign(new Error("Transaction expired"), { code: "P2028" }),
			{ referenceId: "ERR-123" },
		);

		expect(presentation).toEqual({
			action: "retry",
			description:
				"We couldn't complete this action because the system took too long. Please try again.",
			reference: "Reference: ERR-123",
			retryable: true,
			title: "This is taking longer than expected",
		});
	});
});
