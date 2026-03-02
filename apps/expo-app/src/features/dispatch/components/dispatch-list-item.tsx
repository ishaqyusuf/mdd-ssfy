import { DispatchListItem } from "../types/dispatch.types";
import { Pressable, Text, View } from "react-native";
import { formatDate } from "@gnd/utils/dayjs";
import { DispatchStatusBadge } from "./dispatch-status-badge";

type Props = {
  item: DispatchListItem;
  onPress?: (item: DispatchListItem) => void;
};

function getShipTo(item: DispatchListItem) {
  return (
    item?.order?.shippingAddress?.name ||
    item?.order?.customer?.businessName ||
    item?.order?.customer?.name ||
    "N/A"
  );
}

function getPhone(item: DispatchListItem) {
  return item?.order?.shippingAddress?.phoneNo || item?.order?.customer?.phoneNo;
}

function getPackPercentage(item: DispatchListItem) {
  return item?.order?.stat?.[0]?.percentage ?? 0;
}

export function DispatchListItemCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      className="mx-4 mb-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">
          Dispatch #{item.id}
        </Text>
        <DispatchStatusBadge status={item.status} />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm text-muted-foreground">
          Order: <Text className="font-medium text-foreground">{item?.order?.orderId || "-"}</Text>
        </Text>
        <Text className="text-sm text-muted-foreground">
          Due:{" "}
          <Text className="font-medium text-foreground">
            {item?.dueDate ? formatDate(item.dueDate) : "No due date"}
          </Text>
        </Text>
        <Text className="text-sm text-muted-foreground">
          Ship To: <Text className="font-medium text-foreground">{getShipTo(item)}</Text>
        </Text>
        {!!getPhone(item) && (
          <Text className="text-sm text-muted-foreground">
            Phone: <Text className="font-medium text-foreground">{getPhone(item)}</Text>
          </Text>
        )}
        <Text className="text-sm text-muted-foreground">
          Packed:{" "}
          <Text className="font-medium text-foreground">{getPackPercentage(item)}%</Text>
        </Text>
      </View>
    </Pressable>
  );
}
