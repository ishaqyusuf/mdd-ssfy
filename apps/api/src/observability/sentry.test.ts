import { describe, expect, it } from "bun:test";
import { AppError } from "@gnd/errors";
import { TRPCError } from "@trpc/server";
import {
	buildAssistantMonitoringEvent,
	getApiErrorContext,
	isSentryEnabled,
	resolveSentryEnvironment,
	sanitizeApiSentryEvent,
	shouldCaptureTrpcError,
} from "./sentry";

describe("API Sentry capture policy", () => {
	it("uses the same event identity for duplicate Assistant occurrences and keeps expected severity", () => {
		const report = { reference: "ERR-ABCDEFGHIJ", fingerprint: "group-1", stage: "tool", code: "FORBIDDEN", severity: "warning", details: { causes: [{ name: "Error" }], frames: ["apps/api/src/assistant/mcp.ts:10:2"] } };
		const first = buildAssistantMonitoringEvent(report);
		expect(first.event_id).toMatch(/^[a-f0-9]{32}$/);
		expect(buildAssistantMonitoringEvent(report).event_id).toBe(first.event_id);
		expect(buildAssistantMonitoringEvent({ ...report, reference: "ERR-KLMNOPQRST" }).event_id).not.toBe(first.event_id);
		expect(first).toMatchObject({ level: "warning", tags: { assistant_reference: report.reference }, extra: { assistant: report.details } });
		expect(first).not.toHaveProperty("request");
		expect(first).not.toHaveProperty("user");
	});
	it("does not treat a Vercel preview as production", () => {
		expect(
			resolveSentryEnvironment({
				deploymentEnvironment: "preview",
				nodeEnvironment: "production",
			}),
		).toBe("preview");
		expect(
			isSentryEnabled({
				deploymentEnvironment: "preview",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(false);
		expect(
			isSentryEnabled({
				deploymentEnvironment: "production",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(true);
	});

	it("captures reportable database failures based on their cause", () => {
		const prismaTimeout = Object.assign(new Error("Transaction timed out"), {
			code: "P2028",
			name: "PrismaClientKnownRequestError",
		});
		const error = new TRPCError({
			cause: new AppError({
				cause: prismaTimeout,
				code: "DATABASE_TRANSACTION_TIMEOUT",
			}),
			code: "INTERNAL_SERVER_ERROR",
		});

		expect(shouldCaptureTrpcError(error)).toBe(true);
	});

	it("does not report expected client or authorization errors", () => {
		expect(shouldCaptureTrpcError(new TRPCError({ code: "BAD_REQUEST" }))).toBe(
			false,
		);
		expect(
			shouldCaptureTrpcError(new TRPCError({ code: "UNAUTHORIZED" })),
		).toBe(false);
		expect(shouldCaptureTrpcError(new TRPCError({ code: "FORBIDDEN" }))).toBe(
			false,
		);
		expect(shouldCaptureTrpcError(new TRPCError({ code: "NOT_FOUND" }))).toBe(
			false,
		);
	});

	it("does not attach a raw request path to unexpected REST failures", () => {
		const context = getApiErrorContext({
			method: "POST",
			requestId: "request-1",
		});

		expect(context.tags).toMatchObject({
			method: "POST",
			request_id: "request-1",
			runtime: "api",
			source: "hono",
		});
		expect(context.tags).not.toHaveProperty("path");
	});

	it("removes request contents and user identity from SDK-generated events", () => {
		const sanitized = sanitizeApiSentryEvent({
			event_id: "event-1",
			request: {
				data: { customerId: 42 },
				headers: { authorization: "secret" },
				method: "POST",
				query_string: "customerId=42",
				url: "https://api.example.test/orders/42",
			},
			user: {
				email: "customer@example.test",
				id: "42",
			},
		});

		expect(sanitized.request).toEqual({ method: "POST" });
		expect(sanitized.user).toBeUndefined();
	});
});
