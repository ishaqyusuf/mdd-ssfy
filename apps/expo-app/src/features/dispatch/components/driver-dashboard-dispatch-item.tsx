import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { formatDate } from "@gnd/utils/dayjs";
import { Image, Text, View } from "react-native";
import type { DispatchListItem } from "../types/dispatch.types";

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
  return (
    item?.order?.customer?.name ||
    item?.order?.shippingAddress?.name ||
    "No contact"
  );
}

function getLocation(item: DispatchListItem) {
  const ship = item?.order?.shippingAddress as any;
  const parts = [
    ship?.address1,
    ship?.address2,
    ship?.city,
    ship?.state,
    ship?.country,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  const phone = ship?.phoneNo || item?.order?.customer?.phoneNo;
  return phone ? `Phone: ${phone}` : "Address unavailable";
}

function dueText(item: DispatchListItem) {
  return item?.dueDate ? formatDate(item.dueDate) : "No due date";
}

function getStatus(item: DispatchListItem) {
  return String(item?.status || "queue").toLowerCase();
}

function statusLabel(status: string) {
  return status
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasMapData(item: DispatchListItem) {
  const ship = item?.order?.shippingAddress as any;
  const placeId = String(ship?.placeId || "").trim();
  const lat = Number(ship?.lat);
  const lng = Number(ship?.lng);
  return Boolean(placeId) && Number.isFinite(lat) && Number.isFinite(lng);
}

function getPrimaryAction(status: string, onOpen: () => void, onComplete: () => void) {
  if (status === "in progress") {
    return {
      label: "Complete Delivery",
      onPress: onComplete,
      buttonClass: "bg-success",
      textClass: "text-success-foreground",
    };
  }
  if (status === "packed") {
    return {
      label: "Start Trip",
      onPress: onOpen,
      buttonClass: "bg-primary",
      textClass: "text-primary-foreground",
    };
  }
  return {
    label: "View Details",
    onPress: onOpen,
    buttonClass: "bg-secondary",
    textClass: "text-secondary-foreground",
  };
}

type Props = {
  item: DispatchListItem;
  index: number;
  onOpen: () => void;
  onComplete: () => void;
};

export function DriverDashboardDispatchItem({
  item,
  index: _index,
  onOpen,
  onComplete,
}: Props) {
  const status = getStatus(item);
  const action = getPrimaryAction(status, onOpen, onComplete);
  const showMap = hasMapData(item);

  return (
    <Pressable
      onPress={onOpen}
      className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card"
    >
      {({ pressed }) => (
        <View>
          {showMap ? (
            <View className="relative h-36 w-full overflow-hidden">
              <Image
                source={{ uri: MAP_IMAGE }}
                className="h-full w-full"
                resizeMode="cover"
              />
              <View className="absolute right-2 top-2 rounded bg-card/95 px-2 py-1">
                <Text className="text-[10px] font-bold text-destructive">
                  {dueText(item)}
                </Text>
              </View>
              <View className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1">
                <View className="flex-row items-center gap-1">
                  <Icon
                    name="MapPin"
                    className="text-primary-foreground"
                    size={11}
                  />
                  <Text className="text-[10px] font-bold text-primary-foreground">
                    Route
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <View className="p-5">
            <View className="mb-4 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                    Order #{item?.order?.orderId || item.id}
                  </Text>
                  <View className="rounded bg-secondary px-1.5 py-0.5">
                    <Text className="text-[9px] font-black text-secondary-foreground">
                      {statusLabel(status).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text className="text-lg font-bold text-foreground">
                  {getShipTo(item)}
                </Text>
              </View>
              <View className="rounded-lg bg-muted px-2 py-1.5">
                <Text className="text-[10px] font-bold text-muted-foreground">
                  {dueText(item)}
                </Text>
              </View>
            </View>

            <View className="mb-5 gap-3">
              <View className="flex-row items-start gap-2.5">
                <Icon
                  name="User"
                  className="mt-0.5 text-muted-foreground"
                  size={16}
                />
                <Text className="text-sm font-medium text-muted-foreground">
                  {getContact(item)}
                </Text>
              </View>
              <View className="flex-row items-start gap-2.5">
                <Icon
                  name="MapPin"
                  className="mt-0.5 text-muted-foreground"
                  size={16}
                />
                <Text className="flex-1 text-sm text-muted-foreground">
                  {getLocation(item)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={action.onPress}
                className={`flex-1 items-center rounded-lg py-3 active:opacity-85 ${action.buttonClass}`}
              >
                <Text className={`text-sm font-bold ${action.textClass}`}>
                  {action.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={onOpen}
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-4 active:opacity-85"
              >
                <Icon
                  name={showMap ? "LocateIcon" : "ChevronRight"}
                  className="text-primary"
                  size={16}
                />
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
