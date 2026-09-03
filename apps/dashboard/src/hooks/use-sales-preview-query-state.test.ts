import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./use-sales-preview.ts", import.meta.url),
	"utf8",
);

describe("sales preview query-state ownership", () => {
	it("closes only preview-owned params and preserves dispatch context", () => {
		const closeBlock =
			source.match(/function close\(\) \{([\s\S]*?)\n\t\}/)?.[1] ?? "";

		expect(closeBlock).not.toContain("setParams(null)");
		expect(closeBlock).toContain("salesPreviewId: null");
		expect(closeBlock).toContain("previewMode: null");
		expect(closeBlock).not.toContain("dispatchId:");
	});

	it("does not clear an existing dispatch when preview has no dispatch override", () => {
		const previewStart = source.indexOf("async function preview(");
		const setParamsStart = source.indexOf("setParams({", previewStart);
		const setParamsEnd = source.indexOf("\n\t\t});", setParamsStart);
		const openParamsBlock = source.slice(setParamsStart, setParamsEnd);

		expect(openParamsBlock).toContain("...(options?.dispatchId !== undefined");
		expect(openParamsBlock).not.toContain(
			"dispatchId: options?.dispatchId ?? null",
		);
	});
});
