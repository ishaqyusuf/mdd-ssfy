import { Icon } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";

type Props = {
  item: any;
  onPress: () => void;
};

function toMoney(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function initials(name?: string | null) {
  const raw = String(name || "-").trim();
  if (!raw || raw === "-") return "--";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
}

function statusTone(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value.includes("completed")) {
    return {
      chip: "border-emerald-300 bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (value.includes("progress")) {
    return {
      chip: "border-amber-300 bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }
  return {
    chip: "border-border bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

export function SalesOrderCard({ item, onPress }: Props) {
  const total = Number(item?.invoice?.total || 0);
  const paid = Number(item?.invoice?.paid || 0);
  const due = Number(item?.invoice?.pending || 0);
  const paidPct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  const tone = statusTone(item?.deliveryStatus);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-3xl border border-border bg-card active:opacity-90"
    >
      <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />

      <View className="border-b border-border/70 px-4 pb-3 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background">
              <Text className="text-xs font-bold tracking-wide text-foreground">
                {initials(item?.displayName)}
              </Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-foreground">#{item?.orderId}</Text>
              <Text className="mt-0.5 text-xs font-medium text-muted-foreground">
                {item?.displayName || "Unknown Customer"}
              </Text>
            </View>
          </View>

          <View className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${tone.chip}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            <Text className={`text-[10px] font-bold uppercase ${tone.text}`}>
              {item?.deliveryStatus || "pending"}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 py-3">
        <View className="mb-3 flex-row gap-2">
          <MetricChip label="Total" value={toMoney(total)} icon="ReceiptText" />
          <MetricChip label="Paid" value={toMoney(paid)} icon="CircleDollarSign" />
          <MetricChip label="Due" value={toMoney(due)} icon="Wallet" />
        </View>

        <View className="mb-3">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-[11px] font-medium text-muted-foreground">Payment Progress</Text>
            <Text className="text-[11px] font-semibold text-foreground">{paidPct.toFixed(0)}%</Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${paidPct}%` }}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon name="Phone" className="text-muted-foreground" size={14} />
            <Text className="text-xs text-muted-foreground">{item?.customerPhone || "No phone"}</Text>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Icon name="Truck" className="text-muted-foreground" size={14} />
              <Text className="text-xs text-muted-foreground">
                {item?.deliveryOption || "-"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Icon name="Clock" className="text-muted-foreground" size={14} />
              <Text className="text-xs text-muted-foreground">{item?.salesDate || "-"}</Text>
            </View>
            <Icon name="ChevronRight" className="text-muted-foreground" size={16} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MetricChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-background px-2.5 py-2">
      <View className="mb-1 flex-row items-center gap-1.5">
        <Icon name={icon} className="text-muted-foreground" size={12} />
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text className="text-xs font-bold text-foreground">{value}</Text>
    </View>
  );
}
