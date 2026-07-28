import {
  buildWorkflowMouldingRowsContext,
  buildWorkflowMouldingRowsPatch,
  isMouldingItem,
  removeWorkflowMouldingSelection,
  type MouldingRow,
  type WorkflowLineItemRecord,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo } from "react";
import type { NewSalesFormLineItem } from "../types";
import { linePatchChanged } from "../steps/line-workflow-helpers";
import { MouldingRowsEditor } from "../steps/moulding/moulding-rows-editor";

export function WorkflowMouldingLineItemEditor({
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
  const mouldingItem = isMouldingItem(workflowLine);
  const mouldingContext = useMemo(
    () => (mouldingItem ? buildWorkflowMouldingRowsContext(workflowLine) : null),
    [mouldingItem, workflowLine],
  );

  const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
    if (!disabled) onWorkflowPatch?.(patch);
  };

  useEffect(() => {
    if (
      !syncOnMount ||
      disabled ||
      !mouldingContext?.rows.length ||
      !onWorkflowPatch
    ) {
      return;
    }
    const patch = buildWorkflowMouldingRowsPatch({
      line: workflowLine,
      rows: mouldingContext.rows,
      sharedComponentPrice: mouldingContext.sharedComponentPrice,
    }) as Partial<NewSalesFormLineItem>;
    if (!linePatchChanged(line, patch)) return;
    onWorkflowPatch(patch);
  }, [
    disabled,
    line,
    workflowLine,
    mouldingContext,
    onWorkflowPatch,
    syncOnMount,
  ]);

  if (!mouldingItem) return null;

  const updateMouldingRow = (index: number, patch: Partial<MouldingRow>) => {
    if (!mouldingContext) return;
    const rows = mouldingContext.rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    patchWorkflowLine(
      buildWorkflowMouldingRowsPatch({
        line: workflowLine,
        rows,
        sharedComponentPrice: mouldingContext.sharedComponentPrice,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const removeMouldingRow = (row: MouldingRow) => {
    if (!mouldingContext || !row.uid) return;
    const patch = removeWorkflowMouldingSelection({
      line: workflowLine,
      mouldingUid: String(row.uid),
      rows: mouldingContext.rows,
      selectedMouldings: mouldingContext.selectedMouldings,
      sharedComponentPrice: mouldingContext.sharedComponentPrice,
    });
    if (!patch) return;
    patchWorkflowLine(patch as Partial<NewSalesFormLineItem>);
  };

  return (
    <MouldingRowsEditor
      rows={mouldingContext?.rows || []}
      disabled={disabled}
      onChange={updateMouldingRow}
      onRemove={removeMouldingRow}
    />
  );
}
