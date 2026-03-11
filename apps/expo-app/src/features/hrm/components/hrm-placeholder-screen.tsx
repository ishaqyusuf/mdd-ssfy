import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export function HrmPlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
            <Text className="text-2xl font-bold text-foreground">{title}</Text>
            <Text className="text-sm text-muted-foreground">{description}</Text>
          </View>
        </View>

        <View className="rounded-2xl border border-dashed border-border bg-card p-5">
          <Text className="text-sm text-muted-foreground">
            This section is ready as part of MVP navigation. Full functionality will follow.
          </Text>
        </View>
      </View>
    </SafeArea>
  );
}
