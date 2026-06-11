import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import type { InvoiceSaveStatus } from "../types";

const statusTone: Record<InvoiceSaveStatus | "ready", string> = {
  idle: "bg-amber-100 text-amber-700",
  saving: "bg-blue-100 text-blue-700",
  saved: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  stale: "bg-orange-100 text-orange-700",
  ready: "bg-emerald-100 text-emerald-700",
};

export function InvoiceFormHeader({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: InvoiceSaveStatus | "ready";
}) {
  const router = useRouter();
  const label = status === "idle" ? "Draft" : status === "ready" ? "Ready" : status;

  return (
    <View className="border-b border-border/60 bg-background px-4 pb-3 pt-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <Icon name="ArrowLeft" className="text-foreground" size={20} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-foreground">{title}</Text>
          <Text className="text-xs text-muted-foreground">{subtitle}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusTone[status]}`}>
          <Text className={`text-[11px] font-bold capitalize ${statusTone[status]}`}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}
