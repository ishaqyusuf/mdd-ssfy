import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./item-workflow-panel.tsx", import.meta.url),
	"utf8",
);

describe("legacy Shelf workflow UI", () => {
	it("uses the price button as the menu trigger without nesting buttons", () => {
		const priceMenuStart = source.lastIndexOf(
			"<Menu",
			source.indexOf("Edit Shelf Price"),
		);
		const priceMenu = source.slice(
			priceMenuStart,
			source.indexOf("Edit Shelf Price") + "Edit Shelf Price".length,
		);

		expect(priceMenu).toContain("Trigger={");
		expect(priceMenu).not.toContain("label={");
	});
});
