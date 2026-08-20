import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./workflow-step-component-panel.tsx", import.meta.url),
	"utf8",
);

describe("workflow step component panel catalog controls", () => {
	test("keeps the add tile first and exposes separate catalog tabs and workflow steps", () => {
		expect(source.indexOf("leadingSlot={")).toBeLessThan(
			source.indexOf("renderComponent={(component)"),
		);
		for (const label of [
			"Default Components",
			"Custom Components",
			"Hidden Components",
			"Tabs",
			"Steps",
		]) {
			expect(source).toContain(label);
		}
	});

	test("separates custom sale entry from catalog custom configuration", () => {
		expect(source).toContain("onOpenCustomComponent?: () => void");
		expect(source).toContain("onClick={props.onOpenCustomComponent}");
		expect(source).toContain("Custom");
		expect(source).toContain("Disable Custom");
		expect(source).toContain("Enable Custom");
	});

	test("keeps internal catalog actions out of dealership and storefront hosts", () => {
		expect(source).toContain("!props.isDealershipMode &&");
		expect(source).toContain("!props.isStorefrontMode &&");
		expect(source).toContain("{isMultiSelectStep ? (");
		expect(source).not.toContain("disabled={!isMultiSelectStep}");
	});
});
