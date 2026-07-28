import { DispatchPackingHistoryItem } from "../types/dispatch.types";
import { formatDate } from "@gnd/utils/dayjs";
import { formatQty } from "../lib/format-dispatch";
import { Text, View } from "react-native";

type Props = {
  history: DispatchPackingHistoryItem[];
};

export function DispatchPackingHistory({ history }: Props) {
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
            <Text className="text-xs font-semibold text-foreground">{formatQty(item.qty)}</Text>
            <Text className="text-xs text-muted-foreground">
              {formatDate(item.date)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
