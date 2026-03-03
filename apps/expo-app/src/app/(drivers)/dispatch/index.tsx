import { Icon } from "@/components/ui/icon";
import { GeneralHomeHeader } from "@/components/home/general-home-header";
import { useAssignedDispatchList } from "@/features/dispatch/api/use-assigned-dispatch-list";
import type { DispatchListItem } from "@/features/dispatch/types/dispatch.types";
import { formatDate } from "@gnd/utils/dayjs";
import { useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

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
  const parts = [
    ship?.address1,
    ship?.address2,
    ship?.city,
    ship?.state,
    ship?.country,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  const phone = ship?.phoneNo || item?.order?.customer?.phoneNo;
  return phone ? `Phone: ${phone}` : "Address unavailable";
}

function dueText(item: DispatchListItem) {
  return item?.dueDate ? formatDate(item.dueDate) : "No due date";
}

function openDispatch(router: ReturnType<typeof useRouter>, item: DispatchListItem) {
  openDispatchWithOptions(router, item, {});
}

function openDispatchWithOptions(
  router: ReturnType<typeof useRouter>,
  item: DispatchListItem,
  options: { openComplete?: boolean },
) {
  router.push(
    {
      pathname: "/(drivers)/dispatch/[dispatchId]",
      params: {
        dispatchId: String(item.id),
        salesNo: item?.order?.orderId || "",
        openComplete: options.openComplete ? "1" : "0",
      },
    } as any,
  );
}

function MapDispatchCard({
  item,
  onOpen,
}: {
  item: DispatchListItem;
  onOpen: () => void;
}) {
  return (
    <View className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card">
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
    </View>
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
    <View className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card p-5">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Order #{item?.order?.orderId || item.id}
            </Text>
            <View className="rounded bg-secondary px-1.5 py-0.5">
              <Text className="text-[9px] font-black text-secondary-foreground">
                IN PROGRESS
              </Text>
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
          <Text className="text-sm font-bold text-primary-foreground">
            Complete Delivery
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpen}
          className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-4 active:opacity-85"
        >
          <Icon name="LocateIcon" className="text-primary" size={16} />
        </Pressable>
      </View>
    </View>
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
    <View className="mx-4 mb-6 overflow-hidden rounded-xl border border-border bg-card p-5">
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
    </View>
  );
}

export default function DriverDispatchListRoute() {
  const router = useRouter();
  const canTriggerEndReached = useRef(true);

  const {
    items,
    refetch,
    isPending,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useAssignedDispatchList({});

  const stats = useMemo(() => {
    const inProgress = items.filter((item) => item?.status === "in progress").length;
    return {
      assigned: items.length,
      inProgress,
    };
  }, [items]);

  const urgentItems = useMemo(
    () =>
      items
        .filter((item) => item?.status === "queue" || item?.status === "in progress")
        .slice(0, 5),
    [items],
  );

  return (
    <View className="flex-1 bg-background">
      <GeneralHomeHeader
        rightAction="notifications"
        nameMode="first_uppercase"
        className="px-4 pb-6"
      />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-muted-foreground">
            Unable to load dispatches right now.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={urgentItems}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={10}
          windowSize={10}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerClassName="pb-8"
          ListHeaderComponent={
            <View>
      <View className="px-4 pb-5 pt-5">
                <View className="flex-row gap-3.5">
                  <View className="flex-1 rounded-xl bg-primary p-5">
                    <View className="mb-1 flex-row items-center justify-between">
                      <Icon name="ClipboardList" className="text-primary-foreground/90" size={18} />
                      <View className="rounded-full bg-primary-foreground/20 px-2 py-0.5">
                        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-primary-foreground">
                          Active
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-medium uppercase tracking-[1px] text-primary-foreground/80">
                      Assigned
                    </Text>
                    <Text className="text-3xl font-bold text-primary-foreground">
                      {stats.assigned}
                    </Text>
                  </View>

                  <View className="flex-1 rounded-xl border border-border bg-muted p-5">
                    <View className="mb-1 flex-row items-center justify-between">
                      <Icon name="Truck" className="text-primary" size={18} />
                    </View>
                    <Text className="text-xs font-medium uppercase tracking-[1px] text-muted-foreground">
                      In Progress
                    </Text>
                    <Text className="text-3xl font-bold text-foreground">{stats.inProgress}</Text>
                  </View>
                </View>
              </View>

              <View className="px-4 pb-3 pt-1">
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Icon name="TriangleAlert" className="text-destructive" size={18} />
                    <Text className="text-base font-bold text-foreground">Urgent / Due Today</Text>
                  </View>
                  <Pressable onPress={() => router.push("/(drivers)/dispatch/all" as any)}>
                    <Text className="text-xs font-semibold text-primary">View All</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const onOpen = () => openDispatch(router, item);
            const onComplete = () =>
              openDispatchWithOptions(router, item, { openComplete: true });
            if (index % 3 === 0) return <MapDispatchCard item={item} onOpen={onOpen} />;
            if (index % 3 === 1) {
              return (
                <ProgressDispatchCard
                  item={item}
                  onOpen={onOpen}
                  onComplete={onComplete}
                />
              );
            }
            return <CompactDispatchCard item={item} onOpen={onOpen} />;
          }}
          ListEmptyComponent={
            <View className="mx-4 mt-4 items-center rounded-xl border border-dashed border-border p-8">
              <Text className="text-base font-semibold text-foreground">No urgent dispatch</Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Pull to refresh or switch to View All.
              </Text>
            </View>
          }
          onMomentumScrollBegin={() => {
            canTriggerEndReached.current = true;
          }}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (!canTriggerEndReached.current) return;
            if (!hasNextPage || isFetchingNextPage) return;
            canTriggerEndReached.current = false;
            fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
