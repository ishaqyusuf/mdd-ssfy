import { DispatchPackingForm } from "../../dispatch-packing-form";
import { DispatchPackingHistory } from "../../dispatch-packing-history";
import { Modal as SheetModal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "react-native";

type Props = {
  modalRef: any;
  snapPoints: string[];
  selectedItem: any | null;
  canEditPacking: boolean;
  isSubmitting: boolean;
  salesId?: number;
  dispatchId?: number;
  dispatchStatus?: string | null;
  onDismiss: () => void;
  onPackItem: (input: any) => Promise<any>;
  onRefetch: () => Promise<any> | void;
};

export function PackingItemModal({
  modalRef,
  snapPoints,
  selectedItem,
  canEditPacking,
  isSubmitting,
  salesId,
  dispatchId,
  dispatchStatus,
  onDismiss,
  onPackItem,
  onRefetch,
}: Props) {
  return (
    <SheetModal
      ref={modalRef}
      title={selectedItem?.title || "Pack Item"}
      snapPoints={snapPoints}
      onDismiss={onDismiss}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {!!selectedItem && (
          <>
            <Text className="mb-2 text-sm text-muted-foreground">
              Add packing qty and review history
            </Text>
            <DispatchPackingForm
              item={selectedItem as any}
              disabled={!canEditPacking}
              isSubmitting={isSubmitting}
              onSubmit={async (args) => {
                if (!salesId || !dispatchId) return;
                try {
                  await onPackItem({
                    salesId,
                    dispatchId,
                    salesItemId: selectedItem.salesItemId,
                    enteredQty: args.qty,
                    dispatchStatus: (dispatchStatus as any) || "queue",
                    deliverables: (selectedItem.deliverables || []) as any,
                    note: args.note,
                  });
                  Toast.show("Packing saved", { type: "success" });
                  await onRefetch();
                } catch {
                  Toast.show("Unable to save packing entry", {
                    type: "error",
                  });
                }
              }}
            />

            <DispatchPackingHistory history={selectedItem.packingHistory || []} />
          </>
        )}
      </BottomSheetScrollView>
    </SheetModal>
  );
}
