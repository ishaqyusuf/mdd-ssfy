import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./dealer-request-decision-actions.tsx", import.meta.url),
	"utf8",
);

describe("dealer request decision dialog", () => {
	test("collects structured delivery review and rejection context", () => {
		expect(source).not.toContain("window.prompt");
		expect(source).toContain("Reviewed {mode} cost");
		expect(source).toContain("Approver note (optional)");
		expect(source).toContain("Explain why the request is being rejected");
		expect(source).toContain("fulfillmentRecipient");
	});
});
