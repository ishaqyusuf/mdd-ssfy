import { DispatchOverviewItem, QtyMatrix } from "../types/dispatch.types";
import { Icon } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";

type Props = {
  items: DispatchOverviewItem[];
  onSelectItem: (item: DispatchOverviewItem) => void;
};

function asNumber(v?: number | null) {
  return Number(v || 0);
}

function qtyPattern(item: DispatchOverviewItem) {
  const deliverable = item.deliverableQty as QtyMatrix;
  const packed = item.listedQty as QtyMatrix;
  if (asNumber(deliverable?.qty) > 0 || asNumber(packed?.qty) > 0) {
    return `${asNumber(packed?.qty)}/${asNumber(deliverable?.qty)}`;
  }
  return `LR ${asNumber(packed?.lh)}/${asNumber(deliverable?.lh)}  RH ${asNumber(packed?.rh)}/${asNumber(deliverable?.rh)}`;
}

function getPackedProgress(item: DispatchOverviewItem) {
  const deliverable = item.deliverableQty as QtyMatrix;
  const packed = item.listedQty as QtyMatrix;

  const targetTotal =
    asNumber(deliverable?.qty) > 0
      ? asNumber(deliverable?.qty)
      : asNumber(deliverable?.lh) + asNumber(deliverable?.rh);
  const packedTotal =
    asNumber(packed?.qty) > 0
      ? asNumber(packed?.qty)
      : asNumber(packed?.lh) + asNumber(packed?.rh);

  const rawPercent =
    targetTotal <= 0
      ? 0
      : Math.min(100, Math.max(0, (packedTotal / targetTotal) * 100));
  const visualPercent = rawPercent === 0 ? 15 : rawPercent;

  let colorClass = "bg-red-500";
  if (rawPercent >= 80) colorClass = "bg-green-500";
  else if (rawPercent >= 50) colorClass = "bg-blue-500";
  else if (rawPercent >= 25) colorClass = "bg-yellow-500";

  return {
    rawPercent,
    visualPercent,
    colorClass,
  };
}

export function DispatchItemList({ items, onSelectItem }: Props) {
  return (
    <View className="gap-3">
      {items?.map((item) => {
        const progress = getPackedProgress(item);
        return (
          <Pressable
            key={item.uid}
            onPress={() => onSelectItem(item)}
            className="rounded-2xl border border-border bg-card p-4 active:opacity-90"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary">
                <Icon
                  name="ClipboardList"
                  className="size-18 text-foreground"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {item.title}
                </Text>
                {!!item.subtitle && (
                  <Text className="mt-0.5 text-sm uppercase text-muted-foreground">
                    {item.subtitle}
                  </Text>
                )}
              </View>
              <Icon
                name="ChevronRight"
                className="size-16 text-muted-foreground"
              />
            </View>

            <View className="mt-3 rounded-xl border border-border bg-background px-3 py-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  Packed / Target
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {qtyPattern(item)}
                </Text>
              </View>
              <View className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <View style={{ width: `${progress.visualPercent}%` }}>
                  <View className={`h-2 rounded-full ${progress.colorClass}`} />
                </View>
              </View>
              <View className="mt-1 flex-row justify-end">
                <Text className="text-xs text-muted-foreground">
                  {`${Math.round(progress.rawPercent)}%`}
                </Text>
              </View>
            </View>

            <Text className="mt-2 text-xs text-muted-foreground">
              Tap to pack and view history
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
