import { create } from "zustand";
import type {
  DoorStoredRow,
  WorkflowComponentRecord,
} from "@gnd/sales/sales-form-core";

type DoorSizePickerState = {
  component: WorkflowComponentRecord;
  rows: DoorStoredRow[];
  supplierUid?: string | null;
  supplierName?: string | null;
  suppliers?: Array<{
    id?: number | null;
    uid?: string | null;
    name?: string | null;
  }>;
  isLoadingSuppliers?: boolean;
  noHandle?: boolean;
  disabled?: boolean;
  primaryActionLabel?: string;
  showSecondaryAction?: boolean;
  onSupplierChange?: (
    supplier: { uid?: string | null; name?: string | null } | null,
  ) => void;
  onChangeRow: (index: number, patch: Partial<DoorStoredRow>) => void;
  onOk: () => void;
  onNextStep: () => void;
  onClose: () => void;
};

type InvoiceFormModalState = {
  doorSizePicker: DoorSizePickerState | null;
  actions: {
    setDoorSizePicker: (picker: DoorSizePickerState) => void;
    clearDoorSizePicker: () => void;
  };
};

export const useInvoiceFormModalStore = create<InvoiceFormModalState>((set) => ({
  doorSizePicker: null,
  actions: {
    setDoorSizePicker: (picker) => set({ doorSizePicker: picker }),
    clearDoorSizePicker: () => set({ doorSizePicker: null }),
  },
}));
