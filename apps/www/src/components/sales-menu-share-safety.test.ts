import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales-menu.tsx", import.meta.url),
	"utf8",
);

describe("sales menu sharing", () => {
	test("does not embed a fixed customer recipient", () => {
		expect(source).not.toContain("recipient:");
		expect(source).not.toContain("8186877306");
		expect(source).toContain("await share({");
	});
});
