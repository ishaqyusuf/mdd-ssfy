import { describe, expect, test } from "bun:test";
import { isAssistantPdfGenerationEnabled } from "./assistant-pdf-controls";

describe("assistant PDF controls", () => {
	test("permits generation when no operator control disables artifacts", () => {
		expect(isAssistantPdfGenerationEnabled({})).toBe(true);
	});

	test("fails closed for the global, read-only, domain, and effect controls", () => {
		for (const environment of [
			{ ASSISTANT_ENABLED: "false" },
			{ ASSISTANT_READ_ONLY_CANARY: "TRUE" },
			{ ASSISTANT_DISABLED_TOOL_DOMAINS: "sales, DOCUMENTS" },
			{ ASSISTANT_DISABLED_TOOL_EFFECTS: "write, ARTIFACT" },
		]) {
			expect(isAssistantPdfGenerationEnabled(environment)).toBe(false);
		}
	});
});
