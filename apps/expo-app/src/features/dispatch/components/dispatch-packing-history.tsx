import { DispatchPackingHistoryItem } from "../types/dispatch.types";
import { formatDate } from "@gnd/utils/dayjs";
import { formatQty } from "../lib/format-dispatch";
import { Pressable, Text, View } from "react-native";

type Props = {
  history: DispatchPackingHistoryItem[];
  disabled?: boolean;
  isDeleting?: boolean;
  onDelete: (history: DispatchPackingHistoryItem) => Promise<void> | void;
};

export function DispatchPackingHistory({
  history,
  disabled,
  isDeleting,
  onDelete,
}: Props) {
  if (!history?.length) {
    return (
      <Text className="mt-2 text-xs text-muted-foreground">
        No packing history.
      </Text>
    );
  }

  return (
    <View className="mt-3 gap-2">
      <Text className="text-xs font-semibold text-muted-foreground">
        Packing History
      </Text>
      {history.map((item) => (
        <View
          key={String(item.id)}
          className="rounded-lg border border-border bg-background p-2"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-foreground">{item.packedBy || "-"}</Text>
            <Text className="text-xs text-muted-foreground">
              {formatDate(item.date)}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-xs text-foreground">{formatQty(item.qty)}</Text>
            <Pressable
              disabled={disabled || isDeleting}
              onPress={() => onDelete(item)}
              className="rounded-full border border-red-400 px-2 py-1 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-[11px] font-semibold text-red-700">
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
