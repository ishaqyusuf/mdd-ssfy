import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

export function InvoiceFormHeader({
  title,
  onOpenDetails,
}: {
  title: string;
  onOpenDetails: () => void;
}) {
  const router = useRouter();

  return (
    <View className="bg-background px-3 pb-2 pt-3">
      <View className="relative h-11 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Icon name="ChevronLeft" className="text-foreground" size={24} />
        </Pressable>
        <View className="pointer-events-none absolute inset-x-14 items-center">
          <Text
            numberOfLines={1}
            className="text-base font-semibold text-foreground"
          >
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onOpenDetails}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Icon name="more" className="text-foreground" size={23} />
        </Pressable>
      </View>
    </View>
  );
}
