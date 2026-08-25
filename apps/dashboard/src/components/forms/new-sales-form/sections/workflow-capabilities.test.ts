import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { createWwwWorkflowAdminCapabilities } from "./workflow-capabilities";

describe("Dashboard sales form workflow capabilities", () => {
	test("allows only super admins to edit line pricing", () => {
		for (const role of [
			"Super Admin",
			"super admin",
			"SUPER ADMIN",
			"super-admin",
			"super_admin",
			"SuperAdmin",
		]) {
			const capabilities = createWwwWorkflowAdminCapabilities({
				roleTitle: role,
			});
			expect(capabilities.canEditLinePricing).toBe(true);
			expect(capabilities.canEditServiceLinePricing).toBe(true);
		}
		expect(
			createWwwWorkflowAdminCapabilities({ roleTitle: "Admin" }),
		).toMatchObject({
			canEditWorkflowComponents: true,
			canEditLinePricing: false,
			canEditServiceLinePricing: false,
			canEditWorkflowComponentPricing: false,
			canArchiveWorkflowComponents: true,
		});
		expect(
			createWwwWorkflowAdminCapabilities({ roleTitle: "Sales" }),
		).toMatchObject({
			canEditWorkflowComponents: false,
			canEditLinePricing: false,
			canEditServiceLinePricing: false,
			canEditWorkflowComponentPricing: false,
			canArchiveWorkflowComponents: false,
		});
		expect(
			createWwwWorkflowAdminCapabilities({ roleTitle: "Admin" }),
		).toMatchObject({ canCreateWorkflowComponents: false });
	});

	test("lets editOrders users edit only service line pricing controls", () => {
		expect(
			createWwwWorkflowAdminCapabilities({
				roleTitle: "Sales",
				canEditOrders: true,
			}),
		).toMatchObject({
			canEditServiceLinePricing: true,
			canEditLinePricing: false,
			canEditWorkflowComponentPricing: false,
		});
	});

	test("uses the explicit sales-component permission for catalog creation", () => {
		expect(
			createWwwWorkflowAdminCapabilities({
				roleTitle: "Sales",
				canEditSalesComponent: true,
			}),
		).toMatchObject({
			canCreateWorkflowComponents: true,
			canEditWorkflowComponentDetails: true,
			canEditWorkflowComponents: false,
		});
		expect(
			createWwwWorkflowAdminCapabilities({ roleTitle: "Sales" }),
		).toMatchObject({
			canCreateWorkflowComponents: false,
			canEditWorkflowComponentDetails: false,
			canEditWorkflowComponents: false,
		});
	});

	test("wires component creation and custom configuration through the default host", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain(
			"canEditSalesComponent: auth.can?.editSalesComponent",
		);
		expect(source).toContain(
			"workflowAdminCapabilities.canCreateWorkflowComponents",
		);
		expect(source).toContain("onCreateComponent={");
		expect(source).toContain(
			"workflowAdminCapabilities.canEditWorkflowComponentDetails",
		);
		expect(source).toContain("onOpenCustomComponent={() =>");
		expect(source).toMatch(
			/onEnableCustomComponent=\{[\s\S]*componentAdmin\.componentActions\.onEnableCustomComponent/,
		);
	});

	test("wires door size pricing editability through ItemWorkflowPanel", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toMatch(
			/<DoorSizeQtyDialog[\s\S]*canEditPricing=\{[\s\S]*workflowAdminCapabilities\.canEditLinePricing[\s\S]*\}[\s\S]*onPriceSave=/,
		);
		expect(source).toMatch(
			/const refreshed = await doorStepComponentsQuery\.refetch\(\);[\s\S]*setDoorStepModal/,
		);
	});

	test("wires grouped service and shelf pricing editability through capabilities", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toMatch(
			/<ServiceLineItemsEditor[\s\S]*canEditPricing=\{[\s\S]*workflowAdminCapabilities\.canEditServiceLinePricing[\s\S]*\}/,
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

		expect(source).toContain("showRootComponentPrices");
		expect(source).toContain("showActiveStepComponentPrices");
		expect(source).toContain("renderCalculatedComponentPrice(component)");
		expect(source).toContain("? renderCalculatedComponentPrice");
		expect(source).toContain("Calculated sales cost:");
		expect(source).toContain("Base cost:");
		expect(source).toContain(
			"aria-label={`Calculated sales cost ${salesPrice}`}",
		);
	});

	test("provides tooltip context for every item workflow panel", () => {
		const source = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);
		const panelReturn = source.slice(source.lastIndexOf("\n\treturn ("));

		expect(panelReturn).toContain("<TooltipProvider");
		expect(panelReturn).toContain("</TooltipProvider>");
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
