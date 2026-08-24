import { DispatchPackingForm } from "../../dispatch-packing-form";
import { DispatchPackingHistory } from "../../dispatch-packing-history";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Modal as SheetModal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { Text } from "react-native";
import { ManifestItemFacts } from "../components/manifest-item-facts";

const PACKING_ITEM_KEYBOARD_BOTTOM_OFFSET = 96;

type Props = {
	modalRef: any;
	snapPoints: string[];
	selectedItem: any | null;
	canEditPacking: boolean;
	isSubmitting: boolean;
	dispatchId?: number;
	expectedManifestRevision?: string;
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
	dispatchId,
	expectedManifestRevision,
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
			<BottomSheetKeyboardAwareScrollView
				bottomOffset={PACKING_ITEM_KEYBOARD_BOTTOM_OFFSET}
				disableScrollOnKeyboardHide
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
				keyboardShouldPersistTaps="handled"
			>
				{!!selectedItem && (
					<>
						<ManifestItemFacts item={selectedItem} />
						<Text className="mb-2 text-sm font-semibold text-foreground">
							Packing quantity
						</Text>
						<DispatchPackingForm
							item={selectedItem as any}
							disabled={!canEditPacking}
							isSubmitting={isSubmitting}
							onSubmit={async (args) => {
								if (!dispatchId || !expectedManifestRevision) return;
								try {
									await onPackItem({
										dispatchId,
										expectedManifestRevision,
										salesItemId: selectedItem.salesItemId,
										itemUid: selectedItem.uid,
										title: selectedItem.title,
										enteredQty: args.qty,
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

						<DispatchPackingHistory
							history={selectedItem.packingHistory || []}
						/>
					</>
				)}
			</BottomSheetKeyboardAwareScrollView>
		</SheetModal>
	);
}
