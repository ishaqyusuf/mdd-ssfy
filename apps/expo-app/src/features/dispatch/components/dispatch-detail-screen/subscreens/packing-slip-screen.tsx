import { BlurView } from "@/components/blur-view";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { resolveItemImage } from "../lib/resolve-item-image";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

function asNumber(v?: number | null) {
  return Number(v || 0);
}

function qtyTotal(qty?: { qty?: number | null; lh?: number | null; rh?: number | null }) {
  const q = asNumber(qty?.qty);
  if (q > 0) return q;
  return asNumber(qty?.lh) + asNumber(qty?.rh);
}

function mergeQty(
  left: { qty?: number | null; lh?: number | null; rh?: number | null },
  right: { qty?: number | null; lh?: number | null; rh?: number | null },
) {
  return {
    qty: asNumber(left.qty) + asNumber(right.qty),
    lh: asNumber(left.lh) + asNumber(right.lh),
    rh: asNumber(left.rh) + asNumber(right.rh),
  };
}

function effectiveDeliverableQty(item: any) {
  const deliverables = (item?.deliverables || []) as {
    qty?: { qty?: number | null; lh?: number | null; rh?: number | null };
  }[];
  if (deliverables.length) {
    const bySubmission = deliverables.reduce(
      (acc, entry) => mergeQty(acc, (entry?.qty || {}) as any),
      { qty: 0, lh: 0, rh: 0 },
    );
    if (qtyTotal(bySubmission) > 0) return bySubmission;
  }
  const listed = (item?.listedQty || {}) as any;
  if (qtyTotal(listed) > 0) return listed;
  const deliverable = (item?.deliverableQty || {}) as any;
  if (qtyTotal(deliverable) > 0) return deliverable;
  const available = (item?.availableQty || {}) as any;
  if (qtyTotal(available) > 0) return available;
  return (item?.totalQty || {}) as any;
}

type Props = {
  insetsBottom: number;
  dispatchLabel: string;
  customerName: string;
  orderId?: string | null;
  dueDateText: string;
  statusText: string;
  packableItems: any[];
  packingDrafts: Record<string, { qty: number; lh: number; rh: number }>;
  itemHasSingleQty: (item: any) => boolean;
  asNumber: (v?: number | null) => number;
  adjustSingle: (uid: string, max: number, diff: number) => void;
  setSingleValue: (uid: string, max: number, nextValue: number) => void;
  adjustSide: (
    uid: string,
    side: "lh" | "rh",
    max: number,
    diff: number,
  ) => void;
  setSideValue: (
    uid: string,
    side: "lh" | "rh",
    max: number,
    nextValue: number,
  ) => void;
  parseQtyInput: (value: string) => number;
  progressPacked: number;
  progressTotal: number;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenPackAll: () => void;
  onConfirmAndStartTrip: () => void;
  onImagePress: (uri: string) => void;
};

export function PackingSlipScreen({
  insetsBottom,
  dispatchLabel,
  customerName,
  orderId,
  dueDateText,
  statusText,
  packableItems,
  packingDrafts,
  itemHasSingleQty,
  asNumber,
  adjustSingle,
  setSingleValue,
  adjustSide,
  setSideValue,
  parseQtyInput,
  progressPacked,
  progressTotal,
  isSubmitting,
  onClose,
  onOpenPackAll,
  onConfirmAndStartTrip,
  onImagePress,
}: Props) {
  return (
    <View className="absolute inset-0 z-40 bg-background">
      <View className="border-b border-border bg-card px-4 pb-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <Text className="flex-1 text-center text-lg font-bold tracking-tight text-foreground">
            Packing Slip
          </Text>
          <Pressable className="h-10 w-10 items-center justify-center">
            <Icon name="Search" className="text-muted-foreground" size={19} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 176,
        }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View>
              <Text className="mt-1 text-xl font-black text-foreground">
                {dispatchLabel}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Dispatch Summary
              </Text>
            </View>
            <View className="rounded-full bg-primary/15 px-3 py-1">
              <Text className="text-[11px] font-bold capitalize text-primary">
                {statusText}
              </Text>
            </View>
          </View>

          <View className="rounded-xl border border-border/70 bg-card/70 p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                Customer
              </Text>
              <Text className="text-xs font-medium text-foreground">{customerName}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                Order #
              </Text>
              <Text className="text-xs font-medium text-foreground">
                {orderId ? `#${orderId}` : "N/A"}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                Due Date
              </Text>
              <Text className="text-xs font-medium text-foreground">{dueDateText}</Text>
            </View>
          </View>
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-[1.3px] text-muted-foreground">
            Items to Pack
          </Text>
          <Pressable
            onPress={onOpenPackAll}
            className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5"
          >
            <Icon name="Plus" className="text-primary" size={14} />
            <Text className="text-xs font-bold text-primary">Pack All</Text>
          </Pressable>
        </View>

        {packableItems.map((item) => {
          const draft = packingDrafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
          const deliverable = effectiveDeliverableQty(item);
          const hasSingle = itemHasSingleQty(item);
          const maxQty = asNumber(deliverable.qty);
          const maxLh = asNumber(deliverable.lh);
          const maxRh = asNumber(deliverable.rh);
          const singleUnavailable = hasSingle && maxQty <= 0;
          const lhUnavailable = !hasSingle && maxLh <= 0;
          const rhUnavailable = !hasSingle && maxRh <= 0;
          const itemImage = resolveItemImage(item.img as string | null);

          return (
            <View
              key={item.uid}
              className="mb-4 rounded-2xl border border-border bg-card p-4"
            >
              <View className="mb-3 flex-row items-start gap-3">
                {itemImage ? (
                  <Pressable onPress={() => onImagePress(itemImage)}>
                    <Image
                      source={{ uri: itemImage }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: "#F4F4F5",
                      }}
                      contentFit="cover"
                    />
                  </Pressable>
                ) : (
                  <View
                    className="items-center justify-center rounded-xl bg-muted"
                    style={{ width: 52, height: 52 }}
                  >
                    <Icon
                      name="HardHat"
                      className="text-muted-foreground"
                      size={18}
                    />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-semibold leading-tight text-foreground">
                    {item.title}
                  </Text>
                  <Text className="mt-0.5 text-xs uppercase text-muted-foreground">
                    {item.subtitle ||
                      item.sectionTitle ||
                      "No size/type details"}
                  </Text>
                </View>
              </View>

              {hasSingle && !singleUnavailable ? (
                <View
                  className="rounded-xl bg-muted/70 p-3"
                  style={{ opacity: singleUnavailable ? 0.7 : 1 }}
                >
                  <Text className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                    Available: {maxQty}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-muted-foreground">
                      Packed Qty
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        disabled={singleUnavailable}
                        onPress={() => adjustSingle(item.uid, maxQty, -1)}
                        className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
                      >
                        <Icon
                          name="Minus"
                          className="text-foreground"
                          size={16}
                        />
                      </Pressable>
                      <TextInput
                        value={String(draft.qty)}
                        editable={!singleUnavailable}
                        onChangeText={(text) =>
                          setSingleValue(item.uid, maxQty, parseQtyInput(text))
                        }
                        keyboardType="number-pad"
                        style={{
                          width: 56,
                          borderWidth: 1,
                          borderColor: "#D4D4D8",
                          backgroundColor: singleUnavailable ? "#F4F4F5" : "#FFFFFF",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          textAlign: "center",
                          fontSize: 16,
                          fontWeight: "700",
                          color: singleUnavailable ? "#71717A" : "#09090B",
                        }}
                      />
                      <Pressable
                        disabled={singleUnavailable}
                        onPress={() => adjustSingle(item.uid, maxQty, 1)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-primary disabled:opacity-40"
                      >
                        <Icon
                          name="Plus"
                          className="text-primary-foreground"
                          size={16}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : !hasSingle ? (
                <View className="mt-1 flex-row gap-3">
                  {!lhUnavailable ? (
                    <View className="flex-1 rounded-xl bg-muted/70 p-3">
                      <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                        LH Qty (Available: {maxLh})
                      </Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Pressable
                          onPress={() => adjustSide(item.uid, "lh", maxLh, -1)}
                          className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                        >
                          <Icon
                            name="Minus"
                            className="text-foreground"
                            size={14}
                          />
                        </Pressable>
                        <TextInput
                          value={String(draft.lh)}
                          onChangeText={(text) =>
                            setSideValue(
                              item.uid,
                              "lh",
                              maxLh,
                              parseQtyInput(text),
                            )
                          }
                          keyboardType="number-pad"
                          style={{
                            width: 56,
                            borderWidth: 1,
                            borderColor: "#D4D4D8",
                            backgroundColor: "#FFFFFF",
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#09090B",
                          }}
                        />
                        <Pressable
                          onPress={() => adjustSide(item.uid, "lh", maxLh, 1)}
                          className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                        >
                          <Icon
                            name="Plus"
                            className="text-foreground"
                            size={14}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {!rhUnavailable ? (
                    <View className="flex-1 rounded-xl bg-muted/70 p-3">
                      <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                        RH Qty (Available: {maxRh})
                      </Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Pressable
                          onPress={() => adjustSide(item.uid, "rh", maxRh, -1)}
                          className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                        >
                          <Icon
                            name="Minus"
                            className="text-foreground"
                            size={14}
                          />
                        </Pressable>
                        <TextInput
                          value={String(draft.rh)}
                          onChangeText={(text) =>
                            setSideValue(
                              item.uid,
                              "rh",
                              maxRh,
                              parseQtyInput(text),
                            )
                          }
                          keyboardType="number-pad"
                          style={{
                            width: 56,
                            borderWidth: 1,
                            borderColor: "#D4D4D8",
                            backgroundColor: "#FFFFFF",
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#09090B",
                          }}
                        />
                        <Pressable
                          onPress={() => adjustSide(item.uid, "rh", maxRh, 1)}
                          className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                        >
                          <Icon
                            name="Plus"
                            className="text-foreground"
                            size={14}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <BlurView
        intensity={90}
        className="absolute bottom-0 left-0 right-0 border-t border-border"
      >
        <View style={{ paddingBottom: Math.max(22, insetsBottom + 14) }}>
          <View className="px-4 pt-3">
            <ProgressBar
              label="Progress"
              info="Qty Packed"
              value={progressPacked}
              max={progressTotal}
              className="mb-5"
              trackClassName="h-2"
            />
            <Pressable
              disabled={isSubmitting}
              onPress={onConfirmAndStartTrip}
              className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 disabled:opacity-50"
            >
              <Icon
                name="Truck"
                className="text-primary-foreground"
                size={18}
              />
              <Text className="text-base font-bold text-primary-foreground">
                {isSubmitting ? "Saving..." : "Confirm & Start Trip"}
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
