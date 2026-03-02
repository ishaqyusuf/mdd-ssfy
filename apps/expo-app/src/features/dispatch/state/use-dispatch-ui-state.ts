import { useMemo, useState } from "react";

type DispatchUiState = {
  selectedDispatchId: number | null;
  selectedItemUid: string | null;
  isCompleteSheetOpen: boolean;
  isClearPackingDialogOpen: boolean;
  setSelectedDispatchId: (id: number | null) => void;
  setSelectedItemUid: (uid: string | null) => void;
  setCompleteSheetOpen: (open: boolean) => void;
  setClearPackingDialogOpen: (open: boolean) => void;
  reset: () => void;
};

export function useDispatchUiState(): DispatchUiState {
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(
    null,
  );
  const [selectedItemUid, setSelectedItemUid] = useState<string | null>(null);
  const [isCompleteSheetOpen, setCompleteSheetOpen] = useState(false);
  const [isClearPackingDialogOpen, setClearPackingDialogOpen] = useState(false);

  return useMemo(
    () => ({
      selectedDispatchId,
      selectedItemUid,
      isCompleteSheetOpen,
      isClearPackingDialogOpen,
      setSelectedDispatchId,
      setSelectedItemUid,
      setCompleteSheetOpen,
      setClearPackingDialogOpen,
      reset() {
        setSelectedDispatchId(null);
        setSelectedItemUid(null);
        setCompleteSheetOpen(false);
        setClearPackingDialogOpen(false);
      },
    }),
    [
      selectedDispatchId,
      selectedItemUid,
      isCompleteSheetOpen,
      isClearPackingDialogOpen,
    ],
  );
}
