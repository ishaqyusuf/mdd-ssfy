import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { createWwwWorkflowAdminCapabilities } from "./workflow-capabilities";

describe("WWW sales form workflow capabilities", () => {
	test("allows only super admins to edit line pricing", () => {
		for (const role of [
			"Super Admin",
			"super admin",
			"SUPER ADMIN",
			"super-admin",
			"super_admin",
			"SuperAdmin",
		]) {
			expect(createWwwWorkflowAdminCapabilities(role).canEditLinePricing).toBe(
				true,
			);
		}
		expect(createWwwWorkflowAdminCapabilities("Admin")).toMatchObject({
			canEditWorkflowComponents: true,
			canEditLinePricing: false,
			canEditWorkflowComponentPricing: false,
			canArchiveWorkflowComponents: true,
		});
		expect(createWwwWorkflowAdminCapabilities("Sales")).toMatchObject({
			canEditWorkflowComponents: false,
			canEditLinePricing: false,
			canEditWorkflowComponentPricing: false,
			canArchiveWorkflowComponents: false,
		});
	});

	test("wires door size pricing editability through ItemWorkflowPanel", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toMatch(
			/<DoorSizeQtyDialog[\s\S]*canEditPricing=\{[\s\S]*workflowAdminCapabilities\.canEditLinePricing[\s\S]*\}[\s\S]*onPriceSave=/,
		);
	});

	test("wires grouped service and shelf pricing editability through capabilities", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toMatch(
			/<ServiceLineItemsEditor[\s\S]*canEditPricing=\{workflowAdminCapabilities\.canEditLinePricing\}/,
		);
		expect(source).toMatch(
			/<ShelfInlineItemsEditor[\s\S]*canEditPricing=\{workflowAdminCapabilities\.canEditLinePricing\}/,
		);
	});

	test("binds the visible component override before saving a selection", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);
		const saveSelectedComponentArguments = source.match(
			/function saveSelectedComponent\(\{([\s\S]*?)\}\s*:\s*\{/,
		)?.[1];

		expect(saveSelectedComponentArguments).toContain(
			"visibleComponentsOverride",
		);
	});

	test("labels picker prices as calculated sales cost while retaining base cost context", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toMatch(
			/priceSlot=\{renderCalculatedComponentPrice\(component\)\}/,
		);
		expect(source).toContain("priceSlot={renderCalculatedComponentPrice}");
		expect(source).toContain("Calculated sales cost:");
		expect(source).toContain("Base cost:");
		expect(source).toContain(
			"aria-label={`Calculated sales cost ${salesPrice}`}",
		);
	});

	test("returns from HPT to the Door step for an additional door", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);
		const hptSource = readFileSync(
			new URL(
				"../../../../../../../packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const sharedWorkflowPanelSource = readFileSync(
			new URL(
				"../../../../../../../packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(source).toContain("onAddDoor={");
		expect(source).toContain("[line.uid]: doorStepIndex");
		expect(hptSource).toContain('aria-label="Add door"');
		expect(hptSource).toContain("onClick={props.onAddDoor}");
		expect(sharedWorkflowPanelSource).toContain("onAddDoor={");
		expect(sharedWorkflowPanelSource).toContain(
			'setActiveStep(String(line.uid || ""), doorStepIndex)',
		);
	});
});
