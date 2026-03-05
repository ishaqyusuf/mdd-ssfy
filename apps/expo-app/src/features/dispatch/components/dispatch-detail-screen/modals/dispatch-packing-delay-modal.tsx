import { Icon } from "@/components/ui/icon";
import { Modal as SheetModal } from "@/components/ui/modal";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import type { RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { resolveItemImage } from "../lib/resolve-item-image";

type PendingItem = {
	uid: string;
	title: string;
	img?: string | null;
	pendingQty: {
		qty?: number;
		lh?: number;
		rh?: number;
	};
};

type Props = {
	modalRef: RefObject<BottomSheetModal | null>;
	snapPoints: string[];
	items: PendingItem[];
	loadingItemUid?: string | null;
	onReady: (item: PendingItem) => void;
	onDismiss: () => void;
};

function qtyLabel(item: PendingItem) {
	const { qty, lh, rh } = item.pendingQty;
	if ((qty || 0) > 0) return `${qty} qty`;
	return `LH ${lh || 0} / RH ${rh || 0}`;
}

export function DispatchPackingDelayModal({
	modalRef,
	snapPoints,
	items,
	loadingItemUid,
	onReady,
	onDismiss,
}: Props) {
	return (
		<SheetModal
			ref={modalRef}
			title="Pending Production"
			snapPoints={snapPoints}
			onDismiss={onDismiss}
		>
			<BottomSheetScrollView
				contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
			>
				<View className="rounded-2xl border border-border bg-card p-4">
					<Text className="text-base font-semibold text-foreground">
						There are no available packing items.
					</Text>
					<Text className="mt-2 text-sm text-muted-foreground">
						The following items are pending production. Are these items ready
						but system not updated?
					</Text>
				</View>

				<View className="mt-4 gap-3">
					{items.map((item) => {
						const itemImage = resolveItemImage(item.img);
						const isLoading = loadingItemUid === item.uid;

						return (
							<View
								key={item.uid}
								className="rounded-2xl border border-border bg-card p-4"
							>
								<View className="flex-row items-center gap-3">
									{itemImage ? (
										<Image
											source={{ uri: itemImage }}
											style={{
												width: 44,
												height: 44,
												borderRadius: 10,
												backgroundColor: "#F4F4F5",
											}}
											contentFit="cover"
										/>
									) : (
										<View
											className="items-center justify-center rounded-xl bg-muted"
											style={{ width: 44, height: 44 }}
										>
											<Icon
												name="HardHat"
												className="text-muted-foreground"
												size={18}
											/>
										</View>
									)}
									<View className="flex-1">
										<Text className="text-sm font-semibold text-foreground">
											{item.title}
										</Text>
										<Text className="text-xs text-muted-foreground">
											{qtyLabel(item)}
										</Text>
									</View>
									<Pressable
										disabled={isLoading}
										onPress={() => onReady(item)}
										className="rounded-full bg-primary px-3 py-2 disabled:opacity-50"
									>
										<Text className="text-xs font-semibold text-primary-foreground">
											{isLoading ? "Sending..." : "Ready"}
										</Text>
									</Pressable>
								</View>
							</View>
						);
					})}
				</View>
			</BottomSheetScrollView>
		</SheetModal>
	);
}
