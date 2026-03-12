import { Icon } from "@/components/ui/icon";
import { Modal as SheetModal } from "@/components/ui/modal";
import { resolveItemImage } from "../lib/resolve-item-image";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type ProductionItem = {
  uid: string;
  title: string;
  img?: string | null;
  subtitle: string;
  availableCompleted: number;
  pendingProduction: number;
};

type Props = {
  modalRef: any;
  snapPoints: string[];
  packOnlyAvailableChecked: boolean;
  productionItems: ProductionItem[];
  pendingItemsCount: number;
  onDismiss: () => void;
  onTogglePackOnlyAvailable: () => void;
  onPackAll: () => void;
  onCancel: () => void;
  onImagePress: (uri: string) => void;
};

export function PackAllModal({
  modalRef,
  snapPoints,
  packOnlyAvailableChecked,
  productionItems,
  pendingItemsCount,
  onDismiss,
  onTogglePackOnlyAvailable,
  onPackAll,
  onCancel,
  onImagePress,
}: Props) {
  return (
    <SheetModal
      ref={modalRef}
      title="Confirm Pack All"
      snapPoints={snapPoints}
      onDismiss={onDismiss}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <Text className="text-center text-base text-muted-foreground">
          Are you sure you want to pack all items currently pending production?
        </Text>

        <View className="mt-5">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">
            Pending Production ({pendingItemsCount})
          </Text>
          <View className="gap-2">
            {productionItems.map((item) => {
              const itemImage = resolveItemImage(item.img);
              return (
                <View
                  key={item.uid}
                  className="rounded-xl border border-border bg-muted/40 p-4"
                >
                  <View className="flex-row items-center gap-4">
                    {itemImage ? (
                      <Pressable onPress={() => onImagePress(itemImage)}>
                        <Image
                          source={{ uri: itemImage }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            backgroundColor: "#F4F4F5",
                          }}
                          contentFit="cover"
                        />
                      </Pressable>
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon name="ClipboardList" className="text-primary" size={20} />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {item.title}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="text-[11px] font-semibold text-primary">
                        Available completed: {item.availableCompleted}
                      </Text>
                    </View>
                    <Text className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Pending production: {item.pendingProduction}
                    </Text>
                  </View>
                </View>
              );
            })}
            {!productionItems.length ? (
              <View className="rounded-xl border border-border bg-muted/30 p-4">
                <Text className="text-sm text-muted-foreground">
                  No pending production items left to pack.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={onTogglePackOnlyAvailable}
          className="mt-6 flex-row items-start gap-3"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              packOnlyAvailableChecked
                ? "border-primary bg-primary"
                : "border-border bg-background"
            }`}
          >
            {packOnlyAvailableChecked ? (
              <Icon name="Check" className="text-primary-foreground" size={13} />
            ) : null}
          </View>
          <Text className="flex-1 text-sm font-medium text-foreground">
            Pack only available production completed quantities
          </Text>
        </Pressable>

        <View className="mt-6 gap-3">
          <Pressable
            disabled={!productionItems.length}
            onPress={onPackAll}
            className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 disabled:opacity-50"
          >
            <Icon name="HardHat" className="text-primary-foreground" size={18} />
            <Text className="font-bold text-primary-foreground">Pack All Items</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            className="w-full items-center justify-center rounded-xl bg-muted py-4"
          >
            <Text className="font-semibold text-foreground">Cancel</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </SheetModal>
  );
}
