import { describe, expect, test } from "bun:test";
import {
	createMailboxEnvironmentKeyRing,
	createSalesRequestMailboxAdaptersFromEnvironment,
} from "./environment";

const fakeFetch = globalThis.fetch;

describe("Sales Request mailbox environment composition", () => {
	test("configures only providers with a complete credential triplet", () => {
		const result = createSalesRequestMailboxAdaptersFromEnvironment(
			{
				SALES_REQUEST_GMAIL_CLIENT_ID: "gmail-id",
				SALES_REQUEST_GMAIL_CLIENT_SECRET: "gmail-secret",
				SALES_REQUEST_GMAIL_REDIRECT_URI:
					"https://example.test/api/sales-request/mailbox/gmail/callback",
				SALES_REQUEST_MICROSOFT_CLIENT_ID: "microsoft-id",
			},
			{ fetch: fakeFetch },
		);

		expect(Object.keys(result.adapters)).toEqual(["gmail"]);
		expect(result.configuredProviders).toEqual(["gmail"]);
		expect(result.incompleteProviders).toEqual(["microsoft-graph"]);
	});

	test("returns no secret-bearing configuration diagnostics", () => {
		const result = createSalesRequestMailboxAdaptersFromEnvironment(
			{
				SALES_REQUEST_GMAIL_CLIENT_ID: "gmail-id",
				SALES_REQUEST_GMAIL_CLIENT_SECRET: "top-secret",
			},
			{ fetch: fakeFetch },
		);

		expect(JSON.stringify(result)).not.toContain("top-secret");
		expect(result.incompleteProviders).toEqual(["gmail"]);
	});

	test("loads a versioned 32-byte encryption key ring", () => {
		const first = Buffer.alloc(32, 1).toString("base64");
		const second = Buffer.alloc(32, 2).toString("base64");
		const ring = createMailboxEnvironmentKeyRing({
			SALES_REQUEST_MAILBOX_ACTIVE_KEY_VERSION: "v2",
			SALES_REQUEST_MAILBOX_ENCRYPTION_KEYS: JSON.stringify({
				v1: first,
				v2: second,
			}),
		});

		expect(ring.active()).toEqual({
			keyVersion: "v2",
			key: Buffer.alloc(32, 2),
		});
		expect(ring.resolve("v1")).toEqual(Buffer.alloc(32, 1));
	});

	test("fails closed for missing, malformed, or wrong-sized encryption keys", () => {
		for (const env of [
			{},
			{
				SALES_REQUEST_MAILBOX_ACTIVE_KEY_VERSION: "v1",
				SALES_REQUEST_MAILBOX_ENCRYPTION_KEYS: "not-json",
			},
			{
				SALES_REQUEST_MAILBOX_ACTIVE_KEY_VERSION: "v1",
				SALES_REQUEST_MAILBOX_ENCRYPTION_KEYS: JSON.stringify({
					v1: Buffer.alloc(31).toString("base64"),
				}),
			},
		]) {
			expect(() => createMailboxEnvironmentKeyRing(env)).toThrow(
				"Mailbox encryption is not configured.",
			);
		}
	});
});
