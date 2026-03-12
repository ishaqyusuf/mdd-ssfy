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
  addressLine1: string;
  addressLine2: string;
  packingConfirmItems: ConfirmItem[];
  canStartTripFromConfirm: boolean;
  isStarting: boolean;
  onClose: () => void;
  onViewOrderDetails: () => void;
  onPrimaryAction: () => void;
  onImagePress: (uri: string) => void;
};

export function StartTripConfirmScreen({
  insetsTop,
  insetsBottom,
  pageTitle,
  orderId,
  addressLine1,
  addressLine2,
  packingConfirmItems,
  canStartTripFromConfirm,
  isStarting,
  onClose,
  onViewOrderDetails,
  onPrimaryAction,
  onImagePress,
}: Props) {
  return (
    <View className="absolute inset-0 z-[60] bg-background">
      <View>
        <View className="sticky top-0 z-10 flex-row items-center justify-between border-b border-border bg-card/95 px-4 py-3">
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <Text className="flex-1 pr-10 text-center text-lg font-bold tracking-tight text-foreground">
            Confirm & Start Trip
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        <View className="p-4">
          <View className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
            <View className="aspect-video w-full items-center justify-center bg-muted">
              <Icon
                name="Warehouse"
                className="text-muted-foreground"
                size={30}
              />
            </View>
            <View className="p-4">
              <View className="mb-2 flex-row items-center gap-2.5">
                <View className="rounded-md bg-emerald-100 px-2 py-1 dark:bg-emerald-900/30">
                  <Text className="text-xs font-bold uppercase tracking-[1.1px] text-emerald-700 dark:text-emerald-400">
                    Packed
                  </Text>
                </View>
                <Text className="text-sm font-medium text-muted-foreground">
                  {orderId ? `Order #${orderId}` : pageTitle}
                </Text>
              </View>
              <Text className="mb-2 text-xl font-bold leading-tight text-foreground">
                Industrial Equipment Delivery
              </Text>
              <View className="mb-3 flex-row items-start gap-2.5">
                <Icon
                  name="MapPin"
                  className="mt-0.5 text-muted-foreground"
                  size={14}
                />
                <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                  {addressLine1 || "Address unavailable"}
                  {addressLine2 ? `, ${addressLine2}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={onViewOrderDetails}
                className="h-10 items-center justify-center rounded-lg bg-primary/10 active:bg-primary/20"
              >
                <Text className="text-sm font-semibold text-primary">
                  View Order Details
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-4 pb-4">
          <View className="relative h-32 overflow-hidden rounded-xl border border-border bg-muted shadow-sm shadow-black/5">
            <View className="absolute inset-0 items-center justify-center">
              <Icon
                name="Route"
                className="text-muted-foreground/60"
                size={22}
              />
            </View>
            <View className="absolute inset-x-0 bottom-0 h-16 bg-black/25" />
            <View className="absolute bottom-3 left-4 flex-row items-center gap-2">
              <Icon name="Route" className="text-white" size={16} />
              <Text className="text-sm font-medium text-white">
                Est. Route: 14.5 miles (22 min)
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-2 border-t border-border bg-card">
          <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
            <Text className="text-lg font-bold tracking-tight text-foreground">
              Packing Summary
            </Text>
            <Text className="text-xs font-bold uppercase tracking-[1px] text-primary">
              Verified
            </Text>
          </View>
          {packingConfirmItems.map((item, index) => {
            const itemImage = resolveItemImage(item.img);
            return (
              <View
                key={item.uid}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index > 0 ? "border-t border-border/70" : ""
                } ${item.isVerified ? "" : "opacity-60"}`}
              >
                <View className="flex-row items-center gap-4">
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
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-muted transition-colors">
                      <Icon
                        name={item.icon as any}
                        className={
                          item.isVerified
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                        size={20}
                      />
                    </View>
                  )}
                  <View>
                    <Text
                      className={`text-base font-semibold leading-tight ${
                        item.isVerified
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }`}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Icon
                    name={item.isVerified ? "CircleCheck" : "Ban"}
                    className={
                      item.isVerified
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    }
                    size={17}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      item.isVerified
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.isVerified ? "Confirmed" : "Skipped"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          paddingBottom: Math.max(12, insetsBottom + 8),
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <View className="border-t border-border bg-card/90 px-4 pt-4">
          <Pressable
            onPress={onPrimaryAction}
            disabled={isStarting}
            className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-primary shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <Icon
              name={canStartTripFromConfirm ? "Truck" : "HardHat"}
              className="text-primary-foreground"
              size={20}
            />
            <Text className="text-lg font-bold text-primary-foreground">
              {isStarting
                ? "Starting..."
                : canStartTripFromConfirm
                  ? "Start Trip"
                  : "Pack Items"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
