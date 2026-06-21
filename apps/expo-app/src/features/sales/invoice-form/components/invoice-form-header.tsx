import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

export function InvoiceFormHeader({
  title,
  onOpenDetails,
  onOpenItemsSheet,
}: {
  title: string;
  onOpenDetails: () => void;
  onOpenItemsSheet?: (() => void) | null;
}) {
  const router = useRouter();
  const titleButtonDisabled = !onOpenItemsSheet;

  return (
    <View className="bg-background px-3 pb-2 pt-3">
      <View className="relative h-11 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Icon name="ChevronLeft" className="text-foreground" size={24} />
        </Pressable>
        <View className="absolute inset-x-14 items-center">
          <Pressable
            onPress={onOpenItemsSheet || undefined}
            disabled={titleButtonDisabled}
            className="min-h-11 max-w-full flex-row items-center justify-center gap-1 rounded-full px-3 active:opacity-60 disabled:opacity-100"
          >
            <Text
              numberOfLines={1}
              className="shrink text-base font-semibold text-foreground"
            >
              {title}
            </Text>
            {onOpenItemsSheet ? (
              <Icon
                name="ChevronDown"
                className="size-sm text-muted-foreground"
              />
            ) : null}
          </Pressable>
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
