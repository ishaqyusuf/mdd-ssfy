import {
	type ServiceRow,
	type WorkflowLineItemRecord,
	buildWorkflowServiceRowsContext,
	buildWorkflowServiceRowsPatch,
	isServiceItem,
} from "@gnd/sales/sales-form-core";
import { useCallback, useEffect, useMemo } from "react";
import { linePatchChanged } from "../steps/line-workflow-helpers";
import {
	ServiceRowsEditor,
	createServiceRow,
} from "../steps/service/service-rows-editor";
import type { NewSalesFormLineItem } from "../types";

export function WorkflowServiceLineItemEditor({
	line,
	disabled,
	onWorkflowPatch,
	onAddServiceChange,
	syncOnMount = true,
	hideAddButton = false,
}: {
	line: NewSalesFormLineItem;
	disabled?: boolean;
	onWorkflowPatch?: (patch: Partial<NewSalesFormLineItem>) => void;
	onAddServiceChange?: (handler: (() => void) | null) => void;
	syncOnMount?: boolean;
	hideAddButton?: boolean;
}) {
	const workflowLine = line as unknown as WorkflowLineItemRecord;
	const serviceItem = isServiceItem(workflowLine);
	const serviceContext = useMemo(
		() => (serviceItem ? buildWorkflowServiceRowsContext(workflowLine) : null),
		[serviceItem, workflowLine],
	);
	const serviceRows = serviceContext?.rows || [];

	const patchWorkflowLine = useCallback(
		(patch: Partial<NewSalesFormLineItem>) => {
			if (!disabled) onWorkflowPatch?.(patch);
		},
		[disabled, onWorkflowPatch],
	);

	useEffect(() => {
		if (!syncOnMount || disabled || !serviceRows.length || !onWorkflowPatch) {
			return;
		}
		const patch = buildWorkflowServiceRowsPatch({
			line: workflowLine,
			rows: serviceRows,
		}) as Partial<NewSalesFormLineItem>;
		if (!linePatchChanged(line, patch)) return;
		onWorkflowPatch(patch);
	}, [disabled, line, workflowLine, onWorkflowPatch, serviceRows, syncOnMount]);

	const addServiceRow = useCallback(() => {
		patchWorkflowLine(
			buildWorkflowServiceRowsPatch({
				line: workflowLine,
				rows: [...serviceRows, createServiceRow(serviceRows.length + 1)],
			}) as Partial<NewSalesFormLineItem>,
		);
	}, [patchWorkflowLine, serviceRows, workflowLine]);

	useEffect(() => {
		if (!serviceItem || disabled) {
			onAddServiceChange?.(null);
			return;
		}
		onAddServiceChange?.(addServiceRow);
		return () => onAddServiceChange?.(null);
	}, [addServiceRow, disabled, onAddServiceChange, serviceItem]);

	if (!serviceItem) return null;

	const updateServiceRow = (index: number, patch: Partial<ServiceRow>) => {
		const rows = serviceRows.map((row, rowIndex) =>
			rowIndex === index ? { ...row, ...patch } : row,
		);
		patchWorkflowLine(
			buildWorkflowServiceRowsPatch({
				line: workflowLine,
				rows,
			}) as Partial<NewSalesFormLineItem>,
		);
	};

	const removeServiceRow = (index: number) => {
		patchWorkflowLine(
			buildWorkflowServiceRowsPatch({
				line: workflowLine,
				rows: serviceRows.filter((_row, rowIndex) => rowIndex !== index),
			}) as Partial<NewSalesFormLineItem>,
		);
	};

	return (
		<ServiceRowsEditor
			rows={serviceRows}
			disabled={disabled}
			hideAddButton={hideAddButton}
			onChange={updateServiceRow}
			onAdd={addServiceRow}
			onRemove={removeServiceRow}
		/>
	);
}
