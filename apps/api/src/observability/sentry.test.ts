import { describe, expect, it } from "bun:test";
import {
	getApiErrorContext,
	isSentryEnabled,
	resolveSentryEnvironment,
	sanitizeApiSentryEvent,
	shouldCaptureTrpcError,
} from "./sentry";

describe("API Sentry capture policy", () => {
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

	it("captures unexpected internal failures", () => {
		expect(shouldCaptureTrpcError("INTERNAL_SERVER_ERROR")).toBe(true);
	});

	it("does not report expected client or authorization errors", () => {
		expect(shouldCaptureTrpcError("BAD_REQUEST")).toBe(false);
		expect(shouldCaptureTrpcError("UNAUTHORIZED")).toBe(false);
		expect(shouldCaptureTrpcError("FORBIDDEN")).toBe(false);
		expect(shouldCaptureTrpcError("NOT_FOUND")).toBe(false);
	});

	it("does not attach a raw request path to unexpected REST failures", () => {
		expect(getApiErrorContext({ method: "POST" })).toEqual({
			tags: {
				method: "POST",
				runtime: "api",
				source: "hono",
			},
		});
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
