import { Icon } from "@/components/ui/icon";
import { resolveItemImage } from "../lib/resolve-item-image";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";

type ConfirmItem = {
  uid: string;
  title: string;
  img?: string | null;
  subtitle: string;
  isVerified: boolean;
  icon: string;
};

type Props = {
  insetsTop: number;
  insetsBottom: number;
  pageTitle: string;
  orderId?: string | null;
  packingConfirmItems: ConfirmItem[];
  verifiedPackingCount: number;
  verificationPercent: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onConfirmDispatch: () => void;
  onImagePress: (uri: string) => void;
};

export function DispatchConfirmScreen({
  insetsTop,
  insetsBottom,
  pageTitle,
  orderId,
  packingConfirmItems,
  verifiedPackingCount,
  verificationPercent,
  isSubmitting,
  onClose,
  onSaveDraft,
  onConfirmDispatch,
  onImagePress,
}: Props) {
  return (
    <View className="absolute inset-0 z-50 bg-background">
      <View style={{ paddingTop: insetsTop + 8 }}>
        <View className="border-b border-border bg-card/90 px-4 py-3">
          <View className="flex-row items-center">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted/40"
            >
              <Icon name="ArrowLeft" className="text-foreground" size={20} />
            </Pressable>
            <View className="flex-1 px-4">
              <Text className="text-lg font-bold text-foreground">
                {orderId ? `Order #${orderId}` : pageTitle}
              </Text>
              <Text className="text-xs font-medium uppercase tracking-[1.2px] text-muted-foreground">
                Dispatch Flow
              </Text>
            </View>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-muted/40">
              <Icon name="more" className="text-foreground" size={20} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        <View className="px-4 pb-2 pt-6">
          <Text className="text-2xl font-bold text-foreground">
            Packing List Details
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Review and verify items before dispatch
          </Text>
        </View>

        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between rounded-xl border border-primary/15 bg-primary/5 p-4">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-primary">
                Verification Progress
              </Text>
              <Text className="mt-1 text-xl font-bold text-foreground">
                {verifiedPackingCount} / {packingConfirmItems.length} Items
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary">
              <Text className="text-xs font-bold text-primary">
                {verificationPercent}%
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-1 px-2">
          {packingConfirmItems.map((item) => {
            const itemImage = resolveItemImage(item.img);
            return (
              <View
                key={item.uid}
                className={`min-h-[80px] flex-row items-center gap-4 rounded-xl bg-card px-3 py-3 ${
                  item.isVerified ? "" : "opacity-75"
                }`}
              >
                {itemImage ? (
                  <Pressable onPress={() => onImagePress(itemImage)}>
                    <Image
                      source={{ uri: itemImage }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: "#F4F4F5",
                      }}
                      contentFit="cover"
                    />
                  </Pressable>
                ) : (
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-lg ${
                      item.isVerified ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <Icon
                      name={item.icon as any}
                      className={item.isVerified ? "text-primary" : "text-muted-foreground"}
                      size={20}
                    />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-semibold leading-tight text-foreground">
                    {item.title}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${
                      item.isVerified ? "text-muted-foreground" : "italic text-muted-foreground"
                    }`}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <View className="shrink-0">
                  {item.isVerified ? (
                    <View className="flex-row items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1">
                      <Icon name="CircleCheck" className="text-emerald-700" size={12} />
                      <Text className="text-xs font-bold text-emerald-700">Verified</Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-muted px-3 py-1">
                      <Text className="text-xs font-bold text-muted-foreground">Pending</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          <View className="h-24" />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card">
        <View style={{ paddingBottom: Math.max(16, insetsBottom + 10) }}>
          <View className="px-4 pt-4">
            <View className="flex-row gap-3">
              <Pressable
                onPress={onSaveDraft}
                disabled={isSubmitting}
                className="h-12 flex-1 items-center justify-center rounded-xl bg-muted disabled:opacity-50"
              >
                <Text className="text-sm font-bold text-foreground">
                  {isSubmitting ? "Saving..." : "Save Draft"}
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirmDispatch}
                disabled={isSubmitting}
                className="h-12 flex-1 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                <Text className="text-sm font-bold text-primary-foreground">
                  {isSubmitting ? "Saving..." : "Confirm Dispatch"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
