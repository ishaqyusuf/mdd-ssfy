import {
  buildWorkflowServiceRowsContext,
  buildWorkflowServiceRowsPatch,
  isServiceItem,
  type ServiceRow,
  type WorkflowLineItemRecord,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo } from "react";
import { linePatchChanged } from "../steps/line-workflow-helpers";
import {
  createServiceRow,
  ServiceRowsEditor,
} from "../steps/service/service-rows-editor";
import type { NewSalesFormLineItem } from "../types";

export function WorkflowServiceLineItemEditor({
  line,
  disabled,
  onWorkflowPatch,
  syncOnMount = true,
}: {
  line: NewSalesFormLineItem;
  disabled?: boolean;
  onWorkflowPatch?: (patch: Partial<NewSalesFormLineItem>) => void;
  syncOnMount?: boolean;
}) {
  const workflowLine = line as unknown as WorkflowLineItemRecord;
  const serviceItem = isServiceItem(workflowLine);
  const serviceContext = useMemo(
    () => (serviceItem ? buildWorkflowServiceRowsContext(workflowLine) : null),
    [serviceItem, workflowLine],
  );
  const serviceRows = serviceContext?.rows || [];

  const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
    if (!disabled) onWorkflowPatch?.(patch);
  };

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

  const addServiceRow = () => {
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: workflowLine,
        rows: [...serviceRows, createServiceRow(serviceRows.length + 1)],
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
      onChange={updateServiceRow}
      onAdd={addServiceRow}
      onRemove={removeServiceRow}
    />
  );
}
