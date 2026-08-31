import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./use-sales-preview.ts", import.meta.url),
	"utf8",
);

describe("sales preview query-state ownership", () => {
	it("closes only preview-owned params and preserves dispatch context", () => {
		const closeBlock = source.slice(
			source.indexOf("close()"),
			source.indexOf("async preview("),
		);

		expect(closeBlock).not.toContain("setParams(null)");
		expect(closeBlock).toContain("salesPreviewId: null");
		expect(closeBlock).toContain("previewMode: null");
		expect(closeBlock).not.toContain("dispatchId:");
	});

	it("does not clear an existing dispatch when preview has no dispatch override", () => {
		const previewBlock = source.slice(source.indexOf("async preview("));
		const openParamsBlock = previewBlock.slice(
			previewBlock.indexOf("setParams({"),
			previewBlock.indexOf("try {"),
		);

		expect(openParamsBlock).toContain("...(options?.dispatchId !== undefined");
		expect(openParamsBlock).not.toContain(
			"dispatchId: options?.dispatchId ?? null",
		);
	});
});
