import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const sources = {
	shelfItems: readFileSync(
		new URL("./shelf-items.tsx", import.meta.url),
		"utf8",
	),
	shelfCategory: readFileSync(
		new URL("./shelf-item-category-input.tsx", import.meta.url),
		"utf8",
	),
	shelfItemHook: readFileSync(
		new URL("../../../hooks/use-shelf-item.tsx", import.meta.url),
		"utf8",
	),
	shelfHook: readFileSync(
		new URL("../../../hooks/use-shelf.tsx", import.meta.url),
		"utf8",
	),
	shelfTable: readFileSync(
		new URL(
			"../../tables-2/sales-form-shelf-items/columns.tsx",
			import.meta.url,
		),
		"utf8",
	),
};

describe("shelf form render stability", () => {
	it("does not set React state from ComboboxContent ref callbacks", () => {
		for (const source of Object.values(sources)) {
			expect(source.includes("ref={(node) => setContent")).toBe(false);
			expect(source.includes("ref={(node) => ctx?.setContent")).toBe(false);
		}
	});

	it("uses stable object refs for the shelf combobox content nodes", () => {
		expect(sources.shelfItems.includes("React.useRef<React.ComponentRef")).toBe(
			true,
		);
		expect(sources.shelfTable.includes("React.useRef<React.ComponentRef")).toBe(
			true,
		);
		expect(
			sources.shelfItemHook.includes("React.useRef<React.ComponentRef"),
		).toBe(true);
		expect(sources.shelfCategory.includes("ref={ctx.contentRef}")).toBe(true);
	});

	it("memoizes the shelf costing helper used by product effects", () => {
		expect(sources.shelfHook.includes("const costCls = useMemo(")).toBe(true);
	});
});
