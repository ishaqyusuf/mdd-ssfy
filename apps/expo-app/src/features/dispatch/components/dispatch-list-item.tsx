import { DispatchListItem } from "../types/dispatch.types";
import { Pressable, Text, View } from "react-native";
import { formatDate } from "@gnd/utils/dayjs";
import { DispatchStatusBadge } from "./dispatch-status-badge";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";

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
  const packed = Number((item as any)?.order?.control?.packed?.total || 0);
  const pending = Number(
    (item as any)?.order?.control?.pendingPacking?.total || 0,
  );
  const total = packed + pending;
  if (total > 0) {
    return Math.max(0, Math.min(100, (packed / total) * 100));
  }
  return item?.order?.stat?.[0]?.percentage ?? 0;
}

export function DispatchListItemCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      className="mx-4 mb-4 rounded-2xl border border-border bg-card active:opacity-80"
    >
      <View className="rounded-t-2xl border-b border-border bg-background px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-secondary p-2">
              <Icon name="ClipboardList" className="size-16 text-foreground" />
            </View>
            <View>
              <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Dispatch
              </Text>
              <Text className="text-base font-bold text-foreground">
                #{item.id}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <DispatchStatusBadge status={item.status} />
            <Text className="mt-1 text-[10px] text-muted-foreground">
              Order {item?.order?.orderId || "-"}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 rounded-full bg-secondary px-2 py-1">
            <Icon name="Calendar" className="size-14 text-muted-foreground" />
            <Text className="text-xs font-medium text-muted-foreground">
              Due Date
            </Text>
          </View>
          <Text className="text-sm font-semibold text-foreground">
            {item?.dueDate ? formatDate(item.dueDate) : "No due date"}
          </Text>
        </View>

        <View className="rounded-xl border border-border bg-background p-3">
          <View className="mb-2 flex-row items-center gap-2">
            <Icon name="MapPin" className="size-14 text-foreground" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer & Location
            </Text>
          </View>
          <Text className="text-sm font-semibold text-foreground">
            {getShipTo(item)}
          </Text>
          {!!getPhone(item) && (
            <View className="mt-2 flex-row items-center gap-2">
              <Icon name="Phone" className="size-14 text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">{getPhone(item)}</Text>
            </View>
          )}
        </View>

        <View className="rounded-xl border border-border bg-background p-3">
          <View className="mb-2 flex-row items-center gap-2">
            <Icon name="CircleCheck" className="size-14 text-foreground" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Packing Progress
            </Text>
          </View>
          <ProgressBar
            label="Packed"
            info="Packed"
            value={Math.max(0, Math.min(100, getPackPercentage(item)))}
            max={100}
            size="sm"
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between rounded-b-2xl border-t border-border bg-background px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Icon name="Truck" className="size-14 text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">View dispatch detail</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-semibold text-foreground">Open</Text>
          <Icon name="ChevronRight" className="size-14 text-foreground" />
        </View>
      </View>
    </Pressable>
  );
}
