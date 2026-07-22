import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const salesPackageRoot = existsSync(resolve(process.cwd(), "src/sales-form"))
	? process.cwd()
	: resolve(process.cwd(), "packages/sales");

describe("workflow component catalog menu parity", () => {
	test("keeps the legacy nested action contract", () => {
		const source = readFileSync(
			resolve(
				salesPackageRoot,
				"src/sales-form/ui/workflow/workflow-component-action-menu.tsx",
			),
			"utf8",
		);
		const labels = [
			"Edit",
			"Details",
			"Visibility",
			"Price",
			"Section Setting Override",
			"Select",
			"Redirect",
			"Delete",
		];
		for (const label of labels) expect(source).toContain(label);
		expect(source.indexOf("Details")).toBeLessThan(
			source.indexOf("Visibility"),
		);
		expect(source.indexOf("Visibility")).toBeLessThan(source.indexOf("Price"));
		expect(source).toContain("pricingDisabled");
		expect(source).toContain("showPricing");
		expect(source).toContain("props.pricingDisabled || !props.onEditPricing");
		expect(source).toContain('aria-label="Component actions"');
	});

	test("isolates catalog selection from the sales selection callback", () => {
		const source = readFileSync(
			resolve(
				salesPackageRoot,
				"src/sales-form/ui/workflow/workflow-step-component-panel.tsx",
			),
			"utf8",
		);
		expect(source).toContain("managementSelection");
		expect(source).toContain("toggleManagementSelection(component)");
		expect(source).toContain("Edit Visibility");
		expect(source).toContain("Unmark All");
		expect(source).toContain("Existing saved sales keep their snapshots");
	});
});
