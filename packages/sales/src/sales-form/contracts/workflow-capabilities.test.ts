import { describe, expect, test } from "bun:test";

import {
	createDealerSalesFormWorkflowCapabilities,
	createInternalSalesFormWorkflowCapabilities,
	createSalesFormWorkflowCapabilities,
} from "./workflow-capabilities";

describe("sales form workflow capabilities", () => {
	test("defaults every workflow capability to disabled", () => {
		expect(createSalesFormWorkflowCapabilities()).toEqual({
			canEditWorkflowComponents: false,
			canEditSectionOverrides: false,
			canManageRedirects: false,
			canManageDoorSizeVariants: false,
			canManageDoorSuppliers: false,
			canDeleteSelectedComponents: false,
			canEnableCustomComponents: false,
			canUseMouldingCalculator: false,
			canEditFlatLineDetails: false,
			canEditLinePricing: false,
			canEditDealerVisibleTotals: false,
		});
	});

	test("enables internal workflow admin controls only for workflow admins", () => {
		expect(
			createInternalSalesFormWorkflowCapabilities({ isWorkflowAdmin: true }),
		).toMatchObject({
			canEditWorkflowComponents: true,
			canEditSectionOverrides: true,
			canManageRedirects: true,
			canManageDoorSizeVariants: true,
			canManageDoorSuppliers: true,
			canDeleteSelectedComponents: true,
			canEnableCustomComponents: true,
			canUseMouldingCalculator: true,
			canEditFlatLineDetails: true,
			canEditLinePricing: true,
		});

		expect(
			createInternalSalesFormWorkflowCapabilities({ isWorkflowAdmin: false }),
		).toMatchObject({
			canEditWorkflowComponents: false,
			canEditSectionOverrides: false,
			canManageRedirects: false,
			canManageDoorSizeVariants: false,
			canManageDoorSuppliers: false,
			canDeleteSelectedComponents: true,
			canEnableCustomComponents: false,
			canUseMouldingCalculator: true,
			canEditFlatLineDetails: true,
			canEditLinePricing: true,
		});
	});

	test("keeps dealership workflow controls dealer-safe", () => {
		expect(createDealerSalesFormWorkflowCapabilities()).toEqual({
			canEditWorkflowComponents: false,
			canEditSectionOverrides: false,
			canManageRedirects: false,
			canManageDoorSizeVariants: false,
			canManageDoorSuppliers: false,
			canDeleteSelectedComponents: true,
			canEnableCustomComponents: false,
			canUseMouldingCalculator: true,
			canEditFlatLineDetails: false,
			canEditLinePricing: false,
			canEditDealerVisibleTotals: false,
		});
	});
});
