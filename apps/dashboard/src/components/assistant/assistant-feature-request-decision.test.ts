import { describe, expect, test } from "bun:test";
import { assistantFeatureRequestDecision } from "./assistant-feature-request-decision";

describe("Assistant feature request decision", () => {
	test("Not now never submits or preserves notification consent", () => {
		expect(assistantFeatureRequestDecision("not_now", true)).toEqual({
			submit: false,
			releaseOptIn: false,
		});
	});

	test("Notify developers preserves the independent release preference", () => {
		expect(assistantFeatureRequestDecision("notify", false)).toEqual({
			submit: true,
			releaseOptIn: false,
		});
	});
});
