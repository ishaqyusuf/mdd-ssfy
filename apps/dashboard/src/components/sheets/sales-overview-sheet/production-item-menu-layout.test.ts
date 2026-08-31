import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const itemMenuSource = readFileSync(
	new URL("./production-item-menu.tsx", import.meta.url),
	"utf8",
);

describe("Production item action menu layout", () => {
	it("keeps all four actions and quantities on one line with standard icons", () => {
		expect(itemMenuSource).toMatch(/<Menu\s+noSize/);
		expect(itemMenuSource).toMatch(
			/min-w-\[250px\] whitespace-nowrap \[&>svg\]:size-4 \[&>svg\]:shrink-0/,
		);
		expect(
			itemMenuSource.match(/className=\{productionActionItemClassName\}/g)
				?.length,
		).toBe(4);
	});
});
