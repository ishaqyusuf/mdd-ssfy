import { SafeArea } from "@/components/safe-area";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export function HrmDashboardScreen() {
  const router = useRouter();

  return (
    <SafeArea>
      <View className="flex-1 bg-background px-4 pt-4">
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">HRM</Text>
            <Text className="text-sm text-muted-foreground">
              Employees, receipts, and payment portal.
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <HrmCtaCard
            icon="Users"
            title="Employees Dashboard"
            description="View employee directory and open employee records"
            onPress={() => router.push("/hrm/employees")}
          />

          <HrmCtaCard
            icon="ReceiptText"
            title="Payment Receipts"
            description="Open receipts and payment history"
            onPress={() => router.push("/hrm/payment-receipts")}
          />

          <HrmCtaCard
            icon="Wallet"
            title="Pay Portal"
            description="Open payment portal tools"
            onPress={() => router.push("/hrm/pay-portal")}
          />
        </View>
      </View>
    </SafeArea>
  );
}

function HrmCtaCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconKeys;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="rounded-full bg-primary/10 p-2">
            <Icon name={icon} className="text-primary" size={18} />
          </View>
          <View className="pr-2">
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            <Text className="text-xs text-muted-foreground">{description}</Text>
          </View>
        </View>

        <Icon name="ChevronRight" className="text-muted-foreground" size={20} />
      </View>
    </Pressable>
  );
}
