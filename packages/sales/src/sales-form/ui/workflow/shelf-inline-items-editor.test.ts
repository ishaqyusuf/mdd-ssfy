import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	productBreadcrumb,
	resolveShelfProductLoadingRowCount,
} from "./shelf-inline-items-editor";

describe("shelf inline product categories", () => {
	it("uses the product category path as the selected-row subtitle", () => {
		expect(
			productBreadcrumb(
				{
					id: 11,
					title: "Carrara",
					categoryPath: [
						{ id: 1, name: "Bifolds" },
						{ id: 2, name: "Hollow Core Molded Bifold" },
					],
				},
				[],
			),
		).toBe("Bifolds > Hollow Core Molded Bifold");
	});

	it("keeps one product table without a separate category card", () => {
		const source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(source).not.toContain("ShelfCategoryPathInput");
		expect(source).not.toContain("category-${section.uid}");
		expect(source.match(/<table\b/g)).toHaveLength(1);
		expect(source).toContain('data-shelf-product-category-tree="true"');
	});

	it("renders a narrow serial-number column aligned to the product input", () => {
		const source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain('<col style={{ width: "2.5rem" }} />');
		expect(source).toContain('aria-label="Serial number"');
		expect(source).toContain(
			'className="flex h-8 items-center justify-center text-xs font-semibold text-muted-foreground"',
		);
		expect(source.indexOf('aria-label="Serial number"')).toBeLessThan(
			source.indexOf('className="px-3 py-2">Product</th>'),
		);
	});

	it("places a selected-product edit action directly after the product input", () => {
		const source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);
		const dialogSource = readFileSync(
			new URL("./shelf-product-edit-dialog.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("props.onEditProduct && editableProduct");
		expect(source.indexOf("<Combobox")).toBeLessThan(
			source.indexOf("<Icons.Pencil"),
		);
		expect(source).toContain("<ShelfProductEditDialog");
		expect(dialogSource).toContain("Edit shelf product");
		expect(dialogSource).toContain("Product name");
		expect(dialogSource).toContain("Cost price");
	});

	it("keeps product suggestions closed after selecting an item", () => {
		const source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("openOnFocus");
		expect(source).not.toContain("onFocus={() =>");
		expect(source).toContain("setOpen(false);");
	});
});

describe("shelf inline product search refresh", () => {
	it("preserves the last settled result footprint while searching", () => {
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: true,
				lastSettledResultCount: null,
			}),
		).toBe(5);
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: true,
				lastSettledResultCount: 1,
			}),
		).toBe(1);
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: true,
				lastSettledResultCount: 20,
			}),
		).toBe(20);
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: true,
				lastSettledResultCount: 80,
			}),
		).toBe(50);
	});

	it("keeps one row after an empty result and no loading rows when settled", () => {
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: true,
				lastSettledResultCount: 0,
			}),
		).toBe(1);
		expect(
			resolveShelfProductLoadingRowCount({
				isSearching: false,
				lastSettledResultCount: 20,
			}),
		).toBe(0);
	});

	it("uses non-interactive skeleton rows instead of clearing the popup", () => {
		const source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(source).not.toContain("if (props.isSearchingProducts) return [];");
		expect(source).toContain('data-shelf-product-search-skeleton="true"');
		expect(source).toContain("aria-busy={props.isSearchingProducts}");
		expect(source).toContain("Searching products...");
		expect(source).toContain(
			"!props.isSearchingProducts && visibleProducts.length === 0",
		);
	});
});
