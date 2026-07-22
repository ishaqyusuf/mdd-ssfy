import { describe, expect, test } from "bun:test";

import {
	filterSalesFormWorkflowDataSource,
	filterSalesFormWorkflowSlots,
} from "./sales-form-engine-panel";
import { createSalesFormWorkflowCapabilities } from "../../contracts";

describe("sales form engine panel gating", () => {
	test("removes privileged workflow slots when capabilities are disabled", () => {
		const noop = () => undefined;
		const slots = filterSalesFormWorkflowSlots(
			{
				renderFlatLineEditor: noop,
				renderDoorSupplierPanel: noop,
				getComponentRedirectOptions: (() => []) as any,
				componentActions: {
					onOpenPricing: noop,
					onEditDetails: noop,
					onEditVisibility: noop,
					onEditSectionOverride: noop,
					onOpenDoorSizeVariant: noop,
					onClearRedirect: noop,
					onSetRedirect: noop,
					onEnableCustomComponent: noop,
					onArchive: noop,
				},
			},
			createSalesFormWorkflowCapabilities({
				canDeleteSelectedComponents: true,
			}),
		);

		expect(slots?.renderFlatLineEditor).toBeUndefined();
		expect(slots?.renderDoorSupplierPanel).toBeUndefined();
		expect(slots?.getComponentRedirectOptions).toBeUndefined();
		expect(slots?.componentActions?.onOpenPricing).toBeUndefined();
		expect(slots?.componentActions?.onEditDetails).toBeUndefined();
		expect(slots?.componentActions?.onEditVisibility).toBeUndefined();
		expect(slots?.componentActions?.onEditSectionOverride).toBeUndefined();
		expect(slots?.componentActions?.onOpenDoorSizeVariant).toBeUndefined();
		expect(slots?.componentActions?.onClearRedirect).toBeUndefined();
		expect(slots?.componentActions?.onSetRedirect).toBeUndefined();
		expect(slots?.componentActions?.onEnableCustomComponent).toBeUndefined();
		expect(slots?.componentActions?.onArchive).toBeUndefined();
	});

	test("keeps admin workflow slots when capabilities are enabled", () => {
		const noop = () => undefined;
		const slots = filterSalesFormWorkflowSlots(
			{
				renderFlatLineEditor: noop,
				renderDoorSupplierPanel: noop,
				getComponentRedirectOptions: (() => []) as any,
				componentActions: {
					onOpenPricing: noop,
					onEditDetails: noop,
					onEditVisibility: noop,
					onEditSectionOverride: noop,
					onOpenDoorSizeVariant: noop,
					onClearRedirect: noop,
					onSetRedirect: noop,
					onEnableCustomComponent: noop,
					onArchive: noop,
				},
			},
			createSalesFormWorkflowCapabilities({
				canEditWorkflowComponents: true,
				canEditWorkflowComponentPricing: true,
				canArchiveWorkflowComponents: true,
				canEditSectionOverrides: true,
				canManageRedirects: true,
				canManageDoorSizeVariants: true,
				canManageDoorSuppliers: true,
				canDeleteSelectedComponents: true,
				canEnableCustomComponents: true,
				canEditFlatLineDetails: true,
			}),
		);

		expect(slots?.renderFlatLineEditor).toBe(noop);
		expect(slots?.renderDoorSupplierPanel).toBe(noop);
		expect(slots?.getComponentRedirectOptions).toBeDefined();
		expect(slots?.componentActions?.onOpenPricing).toBe(noop);
		expect(slots?.componentActions?.onEditDetails).toBe(noop);
		expect(slots?.componentActions?.onEditVisibility).toBe(noop);
		expect(slots?.componentActions?.onEditSectionOverride).toBe(noop);
		expect(slots?.componentActions?.onOpenDoorSizeVariant).toBe(noop);
		expect(slots?.componentActions?.onClearRedirect).toBe(noop);
		expect(slots?.componentActions?.onSetRedirect).toBe(noop);
		expect(slots?.componentActions?.onEnableCustomComponent).toBe(noop);
		expect(slots?.componentActions?.onArchive).toBe(noop);
	});

	test("removes moulding calculator render hook when not allowed", () => {
		const dataSource = {
			useStepRouting: (() => ({ data: null })) as any,
			useStepComponents: (() => ({ data: [] })) as any,
			renderMouldingCalculator: (() => null) as any,
			useDoorSuppliers: (() => ({ data: null })) as any,
		};

		const dealerSafeDataSource = filterSalesFormWorkflowDataSource(
			dataSource,
			createSalesFormWorkflowCapabilities(),
		);
		expect(dealerSafeDataSource.renderMouldingCalculator).toBeUndefined();
		expect(dealerSafeDataSource.useDoorSuppliers).toBeUndefined();

		const internalDataSource = filterSalesFormWorkflowDataSource(
			dataSource,
			createSalesFormWorkflowCapabilities({
				canUseMouldingCalculator: true,
				canManageDoorSuppliers: true,
			}),
		);
		expect(internalDataSource.renderMouldingCalculator).toBe(
			dataSource.renderMouldingCalculator,
		);
		expect(internalDataSource.useDoorSuppliers).toBe(
			dataSource.useDoorSuppliers,
		);
	});
});
