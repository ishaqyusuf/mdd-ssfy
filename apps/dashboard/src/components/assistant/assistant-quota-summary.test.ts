import { describe, expect, test } from "bun:test";

import { formatAssistantQuotaSummary } from "./assistant-quota-summary";

describe("formatAssistantQuotaSummary", () => {
	test("makes an unconfigured allowance explicitly unlimited", () => {
		expect(
			formatAssistantQuotaSummary({
				configured: false,
				remaining: { requests: null, tokens: null },
				resetAt: null,
				warning: false,
			}),
		).toEqual({
			requests: "Unlimited requests",
			tokens: "Unlimited tokens",
			reset: null,
			warning: false,
		});
	});

	test("formats finite allowance and reset metadata", () => {
		const result = formatAssistantQuotaSummary(
			{
				configured: true,
				remaining: { requests: 12, tokens: 34_500 },
				resetAt: "2026-09-18T12:00:00.000Z",
				warning: true,
			},
			"en-US",
		);

		expect(result.requests).toBe("12 requests left");
		expect(result.tokens).toBe("34,500 tokens left");
		expect(result.reset).toStartWith("Resets Sep 18");
		expect(result.warning).toBe(true);
	});

	test("does not expose invalid reset metadata", () => {
		expect(
			formatAssistantQuotaSummary({
				configured: true,
				remaining: { requests: null, tokens: 1 },
				resetAt: "not-a-date",
				warning: false,
			}).reset,
		).toBeNull();
	});
});
