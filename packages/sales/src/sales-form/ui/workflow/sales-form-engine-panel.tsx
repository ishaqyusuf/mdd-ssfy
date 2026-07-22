/** @jsxImportSource react */
"use client";

import { useMemo } from "react";
import type {
	SalesFormWorkflowActions,
	SalesFormWorkflowCapabilities,
	SalesFormWorkflowDataSource,
	SalesFormWorkflowEditorState,
	SalesFormWorkflowPricingSurface,
	SalesFormWorkflowRecord,
	SalesFormWorkflowSurfaceSlots,
} from "../../contracts";
import { createSalesFormWorkflowCapabilities } from "../../contracts";
import {
	SalesFormWorkflowPanel,
	type SalesFormWorkflowPanelProps,
} from "./sales-form-workflow-panel";
import type { WorkflowLineItemRecord } from "./workflow-records";

export type SalesFormEnginePanelProps<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
> = {
	record: SalesFormWorkflowRecord<TLine>;
	editor?: SalesFormWorkflowEditorState;
	actions: SalesFormWorkflowActions<TLine>;
	dataSource: SalesFormWorkflowDataSource;
	pricing?: SalesFormWorkflowPricingSurface<TLine>;
	workflowCapabilities?: Partial<SalesFormWorkflowCapabilities>;
	slots?: SalesFormWorkflowSurfaceSlots<TLine>;
	className?: string;
};

export function filterSalesFormWorkflowSlots<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
>(
	slots: SalesFormWorkflowSurfaceSlots<TLine> | undefined,
	capabilities: SalesFormWorkflowCapabilities,
): SalesFormWorkflowSurfaceSlots<TLine> | undefined {
	if (!slots) return slots;

	return {
		...slots,
		renderFlatLineEditor: capabilities.canEditFlatLineDetails
			? slots.renderFlatLineEditor
			: undefined,
		renderDoorSupplierPanel: capabilities.canManageDoorSuppliers
			? slots.renderDoorSupplierPanel
			: undefined,
		getComponentRedirectOptions: capabilities.canManageRedirects
			? slots.getComponentRedirectOptions
			: undefined,
		componentActions: slots.componentActions
			? {
					onOpenPricing: capabilities.canEditWorkflowComponentPricing
						? slots.componentActions.onOpenPricing
						: undefined,
					onEditDetails: capabilities.canEditWorkflowComponents
						? slots.componentActions.onEditDetails
						: undefined,
					onEditVisibility: capabilities.canEditWorkflowComponents
						? slots.componentActions.onEditVisibility
						: undefined,
					onEditSectionOverride: capabilities.canEditSectionOverrides
						? slots.componentActions.onEditSectionOverride
						: undefined,
					onOpenDoorSizeVariant: capabilities.canManageDoorSizeVariants
						? slots.componentActions.onOpenDoorSizeVariant
						: undefined,
					onClearRedirect: capabilities.canManageRedirects
						? slots.componentActions.onClearRedirect
						: undefined,
					onSetRedirect: capabilities.canManageRedirects
						? slots.componentActions.onSetRedirect
						: undefined,
					onEnableCustomComponent: capabilities.canEnableCustomComponents
						? slots.componentActions.onEnableCustomComponent
						: undefined,
					onArchive: capabilities.canArchiveWorkflowComponents
						? slots.componentActions.onArchive
						: undefined,
				}
			: undefined,
	};
}

export function filterSalesFormWorkflowDataSource(
	dataSource: SalesFormWorkflowDataSource,
	capabilities: SalesFormWorkflowCapabilities,
): SalesFormWorkflowDataSource {
	let next = dataSource;
	if (!capabilities.canUseMouldingCalculator) {
		const { renderMouldingCalculator: _renderMouldingCalculator, ...rest } =
			next;
		next = rest;
	}
	if (!capabilities.canManageDoorSuppliers) {
		const { useDoorSuppliers: _useDoorSuppliers, ...rest } = next;
		next = rest;
	}
	return next;
}

export function SalesFormEnginePanel<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
>(props: SalesFormEnginePanelProps<TLine>) {
	const workflowCapabilities = useMemo(
		() => createSalesFormWorkflowCapabilities(props.workflowCapabilities),
		[props.workflowCapabilities],
	);
	const dataSource = useMemo(
		() =>
			filterSalesFormWorkflowDataSource(props.dataSource, workflowCapabilities),
		[props.dataSource, workflowCapabilities],
	);
	const slots = useMemo(
		() => filterSalesFormWorkflowSlots(props.slots, workflowCapabilities),
		[props.slots, workflowCapabilities],
	);

	const panelProps: SalesFormWorkflowPanelProps<TLine> = {
		record: props.record,
		editor: props.editor,
		actions: props.actions,
		dataSource,
		pricing: props.pricing,
		workflowCapabilities,
		slots,
		className: props.className,
	};

	return <SalesFormWorkflowPanel {...panelProps} />;
}
