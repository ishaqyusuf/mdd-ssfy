import type { DispatchListItem } from "../types/dispatch.types";
import { formatDate } from "@gnd/utils/dayjs";
import { Image, Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/icon";

const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCi2rYWC1JRFzhqHI9Gtm-QS1wqRL_9SGLB6IRixpBSQq9F4lsGKmUuWWwXM3Fm7e0jep82ChjnoPijTvdJlvTZV_7_X2deHoUvaEwRr5yYfigVgwtJYfWz1IfXHYsL25UIB3yBhaxCa8wENUmIT441o6sLIfEJy7KFstBtjEeDXbAu2Me6jIAkjCspzIPTGL-s8IWg4cQeIjO-RjK0Pd-fK1chNfSsPRHptQmsq6CgRyZ9n6UHPrNfrC3qUr-43-db943E5BtoBWw";

function getShipTo(item: DispatchListItem) {
  const raw =
    item?.order?.shippingAddress?.name ||
    item?.order?.customer?.businessName ||
    item?.order?.customer?.name ||
    "Unknown customer";
  return String(raw)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getContact(item: DispatchListItem) {
  return item?.order?.customer?.name || item?.order?.shippingAddress?.name || "No contact";
}

function getLocation(item: DispatchListItem) {
  const ship = item?.order?.shippingAddress as any;
  const parts = [ship?.address1, ship?.address2, ship?.city, ship?.state, ship?.country]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  const phone = ship?.phoneNo || item?.order?.customer?.phoneNo;
  return phone ? `Phone: ${phone}` : "Address unavailable";
}

function dueText(item: DispatchListItem) {
  return item?.dueDate ? formatDate(item.dueDate) : "No due date";
}

function MapDispatchCard({
  item,
  onOpen,
}: {
  item: DispatchListItem;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card"
    >
      {({ pressed }) => (
        <View>
          <View className="relative h-36 w-full overflow-hidden">
            <Image source={{ uri: MAP_IMAGE }} className="h-full w-full" resizeMode="cover" />
            <View className="absolute right-2 top-2 rounded bg-card/95 px-2 py-1">
              <Text className="text-[10px] font-bold text-destructive">{dueText(item)}</Text>
            </View>
            <View className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1">
              <View className="flex-row items-center gap-1">
                <Icon name="MapPin" className="text-primary-foreground" size={11} />
                <Text className="text-[10px] font-bold text-primary-foreground">Route</Text>
              </View>
            </View>
          </View>

          <View className="p-5">
            <View className="mb-3 flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="mb-1 text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  Order #{item?.order?.orderId || item.id}
                </Text>
                <Text className="text-lg font-bold text-foreground">{getShipTo(item)}</Text>
              </View>
              <Icon name="MapPin" className="text-muted-foreground" size={18} />
            </View>

            <View className="mb-5 gap-3">
              <View className="flex-row items-start gap-2.5">
                <Icon name="User" className="mt-0.5 text-muted-foreground" size={16} />
                <Text className="text-sm font-medium text-muted-foreground">{getContact(item)}</Text>
              </View>
              <View className="flex-row items-start gap-2.5">
                <Icon name="MapPin" className="mt-0.5 text-muted-foreground" size={16} />
                <Text className="flex-1 text-sm text-muted-foreground">{getLocation(item)}</Text>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={onOpen}
                className="flex-1 items-center rounded-lg bg-primary py-3 active:opacity-85"
              >
                <Text className="text-sm font-bold text-primary-foreground">Start Trip</Text>
              </Pressable>
              <Pressable
                onPress={onOpen}
                className="items-center justify-center rounded-lg border border-border bg-background px-3 active:opacity-85"
              >
                <Icon name="more" className="text-foreground" size={18} />
              </Pressable>
            </View>
          </View>
          {pressed ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl bg-black/10"
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function ProgressDispatchCard({
  item,
  onOpen,
  onComplete,
}: {
  item: DispatchListItem;
  onOpen: () => void;
  onComplete: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      {({ pressed }) => (
        <View>
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <View className="mb-1 flex-row items-center gap-2">
                <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  Order #{item?.order?.orderId || item.id}
                </Text>
                <View className="rounded bg-secondary px-1.5 py-0.5">
                  <Text className="text-[9px] font-black text-secondary-foreground">IN PROGRESS</Text>
                </View>
              </View>
              <Text className="text-lg font-bold text-foreground">{getShipTo(item)}</Text>
            </View>
            <View className="rounded-lg bg-muted p-2">
              <Icon name="Clock" className="text-foreground" size={18} />
            </View>
          </View>

          <View className="mb-5 gap-3">
            <View className="flex-row items-start gap-2.5">
              <Icon name="User" className="mt-0.5 text-muted-foreground" size={16} />
              <Text className="text-sm font-medium text-muted-foreground">{getContact(item)}</Text>
            </View>
            <View className="flex-row items-start gap-2.5">
              <Icon name="MapPin" className="mt-0.5 text-muted-foreground" size={16} />
              <Text className="flex-1 text-sm text-muted-foreground">{getLocation(item)}</Text>
            </View>
          </View>

          <View className="flex-row gap-2.5">
            <Pressable
              onPress={onComplete}
              className="flex-1 items-center rounded-lg bg-primary py-3 active:opacity-85"
            >
              <Text className="text-sm font-bold text-primary-foreground">Complete Delivery</Text>
            </Pressable>
            <Pressable
              onPress={onOpen}
              className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-4 active:opacity-85"
            >
              <Icon name="LocateIcon" className="text-primary" size={16} />
            </Pressable>
          </View>
          {pressed ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl bg-black/10"
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function CompactDispatchCard({
  item,
  onOpen,
}: {
  item: DispatchListItem;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      {({ pressed }) => (
        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Order #{item?.order?.orderId || item.id}
            </Text>
            <View className="rounded bg-muted px-2 py-1">
              <Text className="text-[10px] font-bold text-muted-foreground">{dueText(item)}</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{getShipTo(item)}</Text>
            <Pressable onPress={onOpen}>
              <Text className="text-sm font-bold text-primary">Details</Text>
            </Pressable>
          </View>
          {pressed ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl bg-black/10"
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

type Props = {
  item: DispatchListItem;
  index: number;
  onOpen: () => void;
  onComplete: () => void;
};

export function DriverDashboardDispatchItem({
  item,
  index,
  onOpen,
  onComplete,
}: Props) {
  if (index % 3 === 0) return <MapDispatchCard item={item} onOpen={onOpen} />;
  if (index % 3 === 1) {
    return <ProgressDispatchCard item={item} onOpen={onOpen} onComplete={onComplete} />;
  }
  return <CompactDispatchCard item={item} onOpen={onOpen} />;
}
