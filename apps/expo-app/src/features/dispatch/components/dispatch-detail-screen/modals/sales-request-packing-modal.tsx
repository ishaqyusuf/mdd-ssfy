import { Icon } from "@/components/ui/icon";
import { Modal as SheetModal } from "@/components/ui/modal";
import { resolveItemImage } from "../lib/resolve-item-image";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import type { RefObject } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type UnpackableItem = {
  uid: string;
  title: string;
  img?: string | null;
  nonDeliverableQty?: {
    qty?: number | null;
    lh?: number | null;
    rh?: number | null;
  } | null;
};

type Selection = {
  selected: boolean;
  qty: number;
  lh: number;
  rh: number;
};

type Props = {
  modalRef: RefObject<BottomSheetModal | null>;
  snapPoints: string[];
  unpackableItems: UnpackableItem[];
  getSelection: (uid: string) => Selection;
  setSelected: (uid: string, selected: boolean) => void;
  setQty: (uid: string, key: "qty" | "lh" | "rh", value: number) => void;
  markAll: () => void;
  parseQtyInput: (value: string) => number;
  asNumber: (v?: number | null) => number;
  hasSingleQty: (qty?: UnpackableItem["nonDeliverableQty"]) => boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onDismiss: () => void;
};

export function SalesRequestPackingModal({
  modalRef,
  snapPoints,
  unpackableItems,
  getSelection,
  setSelected,
  setQty,
  markAll,
  parseQtyInput,
  asNumber,
  hasSingleQty,
  isSubmitting,
  onSubmit,
  onDismiss,
}: Props) {
  const selectedCount = unpackableItems.filter(
    (item) => getSelection(item.uid).selected,
  ).length;

  return (
    <SheetModal
      ref={modalRef}
      title="Request Packing"
      snapPoints={snapPoints}
      onDismiss={onDismiss}
    >
      <View className="flex-1">
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-semibold leading-6 text-foreground">
              Confirm the items currently available for packing.
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted-foreground">
              This sends a request to admin for review and does not pack items immediately.
            </Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">
              Unavailable for packing ({unpackableItems.length})
            </Text>
            <Pressable
              onPress={markAll}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-2 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-primary">
                Mark all
              </Text>
            </Pressable>
          </View>

          <View className="mt-4 gap-3">
            {unpackableItems.map((item) => {
              const selection = getSelection(item.uid);
              const unavailable = item.nonDeliverableQty || {};
              const single = hasSingleQty(unavailable);
              const itemImage = resolveItemImage(item.img);

              return (
                <View
                  key={item.uid}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-row flex-1 items-start gap-3">
                      {itemImage ? (
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
                      ) : (
                        <View
                          className="items-center justify-center rounded-xl bg-muted"
                          style={{ width: 48, height: 48 }}
                        >
                          <Icon
                            name="HardHat"
                            className="text-muted-foreground"
                            size={18}
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {item.title}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setSelected(item.uid, !selection.selected)}
                      className={`h-8 w-8 items-center justify-center rounded-full border ${
                        selection.selected
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {selection.selected ? (
                        <Icon
                          name="Check"
                          className="text-primary-foreground"
                          size={16}
                        />
                      ) : null}
                    </Pressable>
                  </View>

                  {single ? (
                    <View className="mt-3">
                      <Text className="mb-2 text-sm text-muted-foreground">
                        Available candidate qty: {asNumber(unavailable.qty)}
                      </Text>
                      <TextInput
                        value={String(selection.qty)}
                        onChangeText={(text) =>
                          setQty(item.uid, "qty", parseQtyInput(text))
                        }
                        keyboardType="number-pad"
                        style={{
                          borderWidth: 1,
                          borderColor: "#D4D4D8",
                          backgroundColor: "#FFFFFF",
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          color: "#09090B",
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      />
                    </View>
                  ) : (
                    <View className="mt-3 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="mb-2 text-sm text-muted-foreground">
                          LH available: {asNumber(unavailable.lh)}
                        </Text>
                        <TextInput
                          value={String(selection.lh)}
                          onChangeText={(text) =>
                            setQty(item.uid, "lh", parseQtyInput(text))
                          }
                          keyboardType="number-pad"
                          style={{
                            borderWidth: 1,
                            borderColor: "#D4D4D8",
                            backgroundColor: "#FFFFFF",
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: "#09090B",
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-2 text-sm text-muted-foreground">
                          RH available: {asNumber(unavailable.rh)}
                        </Text>
                        <TextInput
                          value={String(selection.rh)}
                          onChangeText={(text) =>
                            setQty(item.uid, "rh", parseQtyInput(text))
                          }
                          keyboardType="number-pad"
                          style={{
                            borderWidth: 1,
                            borderColor: "#D4D4D8",
                            backgroundColor: "#FFFFFF",
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: "#09090B",
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </BottomSheetScrollView>

        <View className="border-t border-border bg-background px-4 pb-4 pt-3">
          <Text className="mb-2 text-sm text-muted-foreground">
            {selectedCount} of {unpackableItems.length} item
            {unpackableItems.length === 1 ? "" : "s"} selected
          </Text>
          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            className="h-12 items-center justify-center rounded-xl bg-primary active:opacity-90 disabled:opacity-50"
          >
            <Text className="text-base font-bold text-primary-foreground">
              {isSubmitting ? "Sending..." : "Select items are available"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SheetModal>
  );
}
