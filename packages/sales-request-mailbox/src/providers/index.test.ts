import { describe, expect, test } from "bun:test";
import { createSalesRequestMailboxAdapter } from "./index";

describe("sales request mailbox provider registry", () => {
	test("constructs the selected provider without making a provider call", () => {
		const gmail = createSalesRequestMailboxAdapter({
			provider: "gmail",
			config: {
				clientId: "client",
				clientSecret: "secret",
				redirectUri: "https://app.example/api/mailbox/gmail/callback",
				fetch: globalThis.fetch,
			},
		});
		const microsoft = createSalesRequestMailboxAdapter({
			provider: "microsoft-graph",
			config: {
				clientId: "client",
				clientSecret: "secret",
				redirectUri: "https://app.example/api/mailbox/microsoft/callback",
				fetch: globalThis.fetch,
			},
		});
		expect(gmail.provider).toBe("gmail");
		expect(microsoft.provider).toBe("microsoft-graph");
	});
});
