import { describe, expect, test } from "bun:test";

import {
	createDealerSalesFormWorkflowCapabilities,
	createInternalSalesFormWorkflowCapabilities,
	createSalesFormWorkflowCapabilities,
} from "./workflow-capabilities";

describe("sales form workflow capabilities", () => {
	test("defaults workflow controls to disabled while preserving component context", () => {
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
			isDealershipMode: false,
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
			canEditLinePricing: false,
			isDealershipMode: false,
		});

		expect(
			createInternalSalesFormWorkflowCapabilities({
				isWorkflowAdmin: true,
				canEditLinePricing: true,
			}),
		).toMatchObject({
			canEditWorkflowComponents: true,
			canEditLinePricing: true,
			isDealershipMode: false,
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
			canEditLinePricing: false,
			isDealershipMode: false,
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
			isDealershipMode: true,
		});
	});
});
