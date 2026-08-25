import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("shelf product picker", () => {
	it("keeps product search results within a scrollable height boundary", () => {
		const v1Source = readFileSync(
			new URL("./shelf-inputs.tsx", import.meta.url),
			"utf8",
		);
		const v2Source = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(v1Source).toContain('data-shelf-product-results="true"');
		expect(v1Source).toContain(
			'className="max-h-72 overflow-y-auto overflow-x-hidden overscroll-contain p-1"',
		);
		expect(v2Source).toContain(
			'className="relative overflow-y-auto overflow-x-hidden overscroll-contain"',
		);
		expect(v2Source).toContain('style={{ maxHeight: "20rem" }}');
	});

	it("uses the shared deep-search authority in both shelf picker versions", () => {
		const v1Source = readFileSync(
			new URL("./shelf-inputs.tsx", import.meta.url),
			"utf8",
		);
		const workflowSource = readFileSync(
			new URL("./sales-form-workflow-panel.tsx", import.meta.url),
			"utf8",
		);
		const inlineEditorSource = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(v1Source).toContain(
			"compileShelfProductSearchIndex(props.products)",
		);
		expect(v1Source).toContain("searchCompiledShelfProductIndex(");
		expect(workflowSource).toContain("compileShelfProductSearchIndex(");
		expect(workflowSource).toContain("searchCompiledShelfProductIndex(");
		expect(workflowSource).toContain("useDeferredValue(shelfProductSearch)");
		expect(inlineEditorSource).toContain(
			"resolveShelfProductLoadingRowCount({",
		);
	});
});
