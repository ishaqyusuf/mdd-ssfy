import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./item-workflow-panel.tsx", import.meta.url),
	"utf8",
);
const sharedSource = readFileSync(
	new URL(
		"../../../../../../../packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx",
		import.meta.url,
	),
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

	it("passes active product-search state through both Shelf editor paths", () => {
		expect(source).toContain("<ShelfInlineItemsEditor");
		expect(source).toContain("shelfProductSearchQuery.isPending ||");
		expect(source).toContain("shelfProductSearchQuery.isFetching");

		expect(sharedSource).toContain("<ShelfInlineItemsEditor");
		expect(sharedSource).toContain(
			"shelfProductSearch !== deferredShelfProductSearch ||",
		);
		expect(sharedSource).toContain("shelfProductIndexQuery?.isPending ||");
		expect(sharedSource).toContain("shelfProductIndexQuery?.isFetching ||");
		expect(sharedSource).toContain("shelfProductSearchQuery?.isPending ||");
		expect(sharedSource).toContain("shelfProductSearchQuery?.isFetching");
	});
});
