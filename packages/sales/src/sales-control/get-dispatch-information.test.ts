import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./get-dispatch-information.ts", import.meta.url),
	"utf8",
);

describe("dispatch information item presentation", () => {
	test("reuses the canonical Production subtitle", () => {
		expect(source.includes("subtitle: item.subtitle")).toBe(true);
		expect(
			source.includes("subtitle: [item.sectionTitle, item.size, item.swing]"),
		).toBe(false);
	});
});
