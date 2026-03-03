import { useDispatchOverview } from "../api/use-dispatch-overview";
import { useDispatchActions } from "../api/use-dispatch-actions";
import { useDispatchPacking } from "../api/use-dispatch-packing";
import { useDispatchUiState } from "../state/use-dispatch-ui-state";
import { DispatchCompleteForm } from "./dispatch-complete-form";
import { formatDispatchDate, totalQty } from "../lib/format-dispatch";
import { Toast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BlurView } from "@/components/blur-view";
import { Modal as SheetModal, useModal } from "@/components/ui/modal";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DispatchPackingForm } from "./dispatch-packing-form";
import { DispatchPackingHistory } from "./dispatch-packing-history";

type Props = {
  dispatchId: number;
  salesNo?: string;
};

type PackingDraft = {
  checked: boolean;
  qty: number;
  lh: number;
  rh: number;
};

function asNumber(v?: number | null) {
  return Number(v || 0);
}

function itemHasSingleQty(item: any) {
  return asNumber(item?.deliverableQty?.qty) > 0;
}

export function DispatchDetailScreen({ dispatchId, salesNo }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ui = useDispatchUiState();
  const actions = useDispatchActions();
  const packing = useDispatchPacking();

  const overview = useDispatchOverview(
    {
      dispatchId,
      salesNo,
    },
    {
      enabled: !!dispatchId,
    },
  );

  const data = overview.data;
  const dispatch = data?.dispatch;
  const order = data?.order;
  const items = useMemo(
    () => (data?.dispatchItems || []).filter((item) => !!item.dispatchable),
    [data?.dispatchItems],
  );
  const canEditPacking = packing.canEditPacking(dispatch?.status as any);
  const [isPackingSlipOpen, setPackingSlipOpen] = useState(false);
  const [packingDrafts, setPackingDrafts] = useState<
    Record<string, PackingDraft>
  >({});
  const selectedItem = useMemo(
    () => items.find((it) => it.uid === ui.selectedItemUid) || null,
    [items, ui.selectedItemUid],
  );
  const {
    ref: packingModalRef,
    present: presentPackingModal,
    dismiss: dismissPackingModal,
  } = useModal();
  const {
    ref: completeModalRef,
    present: presentCompleteModal,
    dismiss: dismissCompleteModal,
  } = useModal();
  const {
    ref: packAllModalRef,
    present: presentPackAllModal,
    dismiss: dismissPackAllModal,
  } = useModal();
  const packingSnapPoints = useMemo(() => ["70%"], []);
  const completeSnapPoints = useMemo(() => ["85%"], []);
  const packAllSnapPoints = useMemo(() => ["88%"], []);
  const [confirmPackAllChecked, setConfirmPackAllChecked] = useState(false);
  const [packOnlyAvailableChecked, setPackOnlyAvailableChecked] =
    useState(true);

  useEffect(() => {
    if (selectedItem) {
      presentPackingModal();
    } else {
      dismissPackingModal();
    }
  }, [selectedItem, presentPackingModal, dismissPackingModal]);

  useEffect(() => {
    if (!isPackingSlipOpen) return;
    setPackingDrafts(
      Object.fromEntries(
        items.map((item) => {
          const listed = (item?.listedQty || {}) as any;
          const hasSingle = itemHasSingleQty(item);
          const qty = hasSingle ? asNumber(listed?.qty) : 0;
          const lh = hasSingle ? 0 : asNumber(listed?.lh);
          const rh = hasSingle ? 0 : asNumber(listed?.rh);
          return [
            item.uid,
            {
              checked: hasSingle ? qty > 0 : lh + rh > 0,
              qty,
              lh,
              rh,
            } satisfies PackingDraft,
          ];
        }),
      ),
    );
  }, [isPackingSlipOpen, items]);

  useEffect(() => {
    if (ui.isCompleteSheetOpen) {
      presentCompleteModal();
    } else {
      dismissCompleteModal();
    }
  }, [ui.isCompleteSheetOpen, presentCompleteModal, dismissCompleteModal]);

  const pageTitle = useMemo(() => {
    return `#DISP-${dispatch?.id || dispatchId}`;
  }, [dispatch?.id, dispatchId]);

  const activityHistory = useMemo(() => {
    const history = items
      .flatMap((item) => item?.packingHistory || [])
      .slice()
      .sort((a, b) => +new Date(b.date as any) - +new Date(a.date as any))
      .slice(0, 4);
    return history;
  }, [items]);
  const statusText = dispatch?.status || "queue";
  const canStart = actions.canStart(dispatch?.status);
  const canCancel = actions.canCancel(dispatch?.status);
  const canComplete = actions.canComplete(dispatch?.status);
  const primaryStatusActionLabel = canStart
    ? "Update Status"
    : canComplete
      ? "Ready To Complete"
      : "In Progress";

  const addressLine1 = useMemo(() => {
    const a = (data?.address || {}) as any;
    return [a?.address1, a?.address2].filter(Boolean).join(", ");
  }, [data?.address]);
  const addressLine2 = useMemo(() => {
    const a = (data?.address || {}) as any;
    return [a?.city, a?.state, a?.country].filter(Boolean).join(", ");
  }, [data?.address]);

  const topPackingItems = useMemo(() => items.slice(0, 3), [items]);
  const packableItems = useMemo(
    () =>
      items.filter((item) => {
        const d = (item.deliverableQty || {}) as any;
        return asNumber(d.qty) > 0 || asNumber(d.lh) > 0 || asNumber(d.rh) > 0;
      }),
    [items],
  );

  const timelineItems = useMemo(() => {
    const dynamic = activityHistory.slice(0, 2).map((event, index) => ({
      id: String(event.id),
      title: index === 0 ? "In Transit" : "Started",
      subtitle: `${formatDispatchDate(event.date as any)}${event.packedBy ? ` - ${event.packedBy}` : ""}`,
      icon: index === 0 ? "Truck" : ("CircleCheck" as const),
      active: index === 0,
    }));
    return [
      ...dynamic,
      {
        id: "assigned",
        title: "Assigned",
        subtitle: `${formatDispatchDate(order?.date as any)} - Dispatch Center`,
        icon: "UserCog" as const,
        active: false,
      },
    ];
  }, [activityHistory, order?.date]);

  const onPrimaryStatusAction = async () => {
    if (!order?.id || !dispatch?.id) return;
    if (canStart) {
      try {
        await actions.onStartDispatch({
          salesId: order.id,
          dispatchId: dispatch.id,
        });
        Toast.show("Dispatch started", { type: "success" });
      } catch {
        Toast.show("Unable to start dispatch", { type: "error" });
      }
      return;
    }
    if (canComplete) {
      ui.setCompleteSheetOpen(true);
    }
  };

  const onMarkDelivered = () => {
    if (canComplete) {
      ui.setCompleteSheetOpen(true);
      return;
    }
    Toast.show("Dispatch is not ready for delivery completion yet.", {
      type: "warning",
    });
  };

  const onIssue = async () => {
    if (!order?.id || !dispatch?.id || !canCancel) {
      Toast.show("Issue reporting is unavailable at this dispatch stage.", {
        type: "warning",
      });
      return;
    }
    try {
      await actions.onCancelDispatch({
        salesId: order.id,
        dispatchId: dispatch.id,
      });
      Toast.show("Dispatch marked with issue and cancelled", {
        type: "success",
      });
    } catch {
      Toast.show("Unable to submit issue", { type: "error" });
    }
  };

  const updateDraft = (
    uid: string,
    updater: (prev: PackingDraft) => PackingDraft,
  ) => {
    setPackingDrafts((prev) => {
      const base = prev[uid] || { checked: false, qty: 0, lh: 0, rh: 0 };
      return {
        ...prev,
        [uid]: updater(base),
      };
    });
  };

  const adjustSingle = (uid: string, max: number, diff: number) => {
    updateDraft(uid, (prev) => {
      const nextQty = Math.max(0, Math.min(max, prev.qty + diff));
      return { ...prev, qty: nextQty, checked: nextQty > 0 };
    });
  };

  const adjustSide = (
    uid: string,
    side: "lh" | "rh",
    max: number,
    diff: number,
  ) => {
    updateDraft(uid, (prev) => {
      const next = Math.max(0, Math.min(max, (prev[side] || 0) + diff));
      const nextState = { ...prev, [side]: next };
      return {
        ...nextState,
        checked: (nextState.lh || 0) + (nextState.rh || 0) > 0,
      };
    });
  };

  const progressPacked = useMemo(() => {
    return packableItems.filter((item) => {
      const d = packingDrafts[item.uid];
      if (!d) return false;
      return d.checked && (d.qty > 0 || d.lh > 0 || d.rh > 0);
    }).length;
  }, [packableItems, packingDrafts]);

  const productionPackAllItems = useMemo(() => {
    return packableItems
      .map((item) => {
        const d = packingDrafts[item.uid] || {
          checked: false,
          qty: 0,
          lh: 0,
          rh: 0,
        };
        const deliverable = (item.deliverableQty || {}) as any;
        const pendingSource = (item.nonDeliverableQty || {}) as any;
        const hasSingle = itemHasSingleQty(item);
        const availableCompleted = hasSingle
          ? asNumber(deliverable.qty)
          : asNumber(deliverable.lh) + asNumber(deliverable.rh);
        const pendingProduction = hasSingle
          ? asNumber(pendingSource.qty)
          : asNumber(pendingSource.lh) + asNumber(pendingSource.rh);
        if (hasSingle) {
          const remaining = Math.max(
            0,
            asNumber(deliverable.qty) - asNumber(d.qty),
          );
          return {
            uid: item.uid,
            title: item.title,
            remaining,
            subtitle: `${remaining} units remaining`,
            availableCompleted,
            pendingProduction,
            hasPending: remaining > 0,
          };
        }
        const remainingLh = Math.max(
          0,
          asNumber(deliverable.lh) - asNumber(d.lh),
        );
        const remainingRh = Math.max(
          0,
          asNumber(deliverable.rh) - asNumber(d.rh),
        );
        const remaining = remainingLh + remainingRh;
        return {
          uid: item.uid,
          title: item.title,
          remaining,
          subtitle: `${remaining} units remaining`,
          availableCompleted,
          pendingProduction,
          hasPending: remaining > 0,
        };
      })
      .filter(
        (item) =>
          item.hasPending ||
          item.availableCompleted > 0 ||
          item.pendingProduction > 0,
      );
  }, [packableItems, packingDrafts]);

  const pendingPackAllItems = useMemo(
    () => productionPackAllItems.filter((item) => item.hasPending),
    [productionPackAllItems],
  );

  const onPackAllDraft = () => {
    const packOnlyAvailable = packOnlyAvailableChecked;
    setPackingDrafts((prev) =>
      Object.fromEntries(
        packableItems.map((item) => {
          const deliverable = (item.deliverableQty || {}) as any;
          const pendingSource = (item.nonDeliverableQty || {}) as any;
          const hasSingle = itemHasSingleQty(item);
          const hasAvailable = hasSingle
            ? asNumber(deliverable.qty) > 0
            : asNumber(deliverable.lh) + asNumber(deliverable.rh) > 0;
          const hasPendingProduction = hasSingle
            ? asNumber(pendingSource.qty) > 0
            : asNumber(pendingSource.lh) + asNumber(pendingSource.rh) > 0;
          const next: PackingDraft = hasSingle
            ? {
                checked: packOnlyAvailable
                  ? hasAvailable
                  : hasAvailable || hasPendingProduction,
                qty: asNumber(deliverable.qty),
                lh: 0,
                rh: 0,
              }
            : {
                checked: packOnlyAvailable
                  ? hasAvailable
                  : hasAvailable || hasPendingProduction,
                qty: 0,
                lh: asNumber(deliverable.lh),
                rh: asNumber(deliverable.rh),
              };
          return [item.uid, next];
        }),
      ),
    );
    setConfirmPackAllChecked(false);
    setPackOnlyAvailableChecked(true);
    dismissPackAllModal();
    Toast.show(
      packOnlyAvailable
        ? "Available completed items are staged for packing."
        : "All production items are staged (available quantities packed now).",
      {
        type: "success",
      },
    );
  };

  const onConfirmPackingSlip = async () => {
    if (!order?.id || !dispatch?.id) return;
    try {
      const changes = packableItems.map((item) => {
        const draft = packingDrafts[item.uid] || {
          checked: false,
          qty: 0,
          lh: 0,
          rh: 0,
        };
        const listed = (item.listedQty || {}) as any;
        const current = {
          qty: asNumber(listed.qty),
          lh: asNumber(listed.lh),
          rh: asNumber(listed.rh),
        };
        return {
          item,
          draft,
          delta: {
            qty: draft.qty - current.qty,
            lh: draft.lh - current.lh,
            rh: draft.rh - current.rh,
          },
          current,
        };
      });

      const hasDecrease = changes.some(
        (entry) =>
          entry.delta.qty < 0 || entry.delta.lh < 0 || entry.delta.rh < 0,
      );

      if (hasDecrease) {
        await packing.onClearPackings({
          salesId: order.id,
          dispatchId: dispatch.id,
        });
      }

      for (const entry of changes) {
        const { item, draft, delta } = entry;
        if (!draft.checked) continue;
        const hasSingle = itemHasSingleQty(item);
        const entered = hasDecrease
          ? hasSingle
            ? { qty: draft.qty }
            : { lh: draft.lh, rh: draft.rh }
          : hasSingle
            ? { qty: Math.max(0, delta.qty) }
            : { lh: Math.max(0, delta.lh), rh: Math.max(0, delta.rh) };

        if (
          asNumber((entered as any).qty) <= 0 &&
          asNumber((entered as any).lh) <= 0 &&
          asNumber((entered as any).rh) <= 0
        ) {
          continue;
        }

        await packing.onPackItem({
          salesId: order.id,
          dispatchId: dispatch.id,
          salesItemId: item.salesItemId,
          enteredQty: entered as any,
          dispatchStatus: (dispatch.status as any) || "queue",
          deliverables: (item.deliverables || []) as any,
          note: "Packed via packing slip",
        });
      }

      await overview.refetch();
      setPackingSlipOpen(false);
      Toast.show("Packing slip updated", { type: "success" });
    } catch {
      Toast.show("Unable to update packing slip", { type: "error" });
    }
  };

  if (overview.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (overview.error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-sm text-muted-foreground">
          Unable to load dispatch details.
        </Text>
        <Pressable
          onPress={() => overview.refetch()}
          className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-80"
        >
          <Text className="font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: insets.top + 6 }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center active:opacity-80"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <Text className="flex-1 px-2 text-lg font-bold tracking-tight text-foreground">
            {order?.orderId ? `Order #${order.orderId}` : pageTitle}
          </Text>
          <Pressable className="h-10 w-10 items-center justify-center rounded-lg active:opacity-80">
            <Icon name="more" className="text-foreground" size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefetching}
            onRefresh={() => {
              overview.refetch();
            }}
          />
        }
      >
        <View className="mb-6 rounded-xl border border-border bg-card p-5">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
                Current Status
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                <Text className="text-base font-bold capitalize text-foreground">
                  {statusText}
                </Text>
              </View>
            </View>
            <Pressable
              disabled={actions.startDispatch.isPending || !canStart}
              onPress={onPrimaryStatusAction}
              className="min-w-[100px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 active:opacity-90 disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {actions.startDispatch.isPending
                  ? "Updating..."
                  : primaryStatusActionLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-6">
          <Text className="mb-3 text-xl font-bold text-foreground">
            Delivery Details
          </Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
              <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary/20">
                <View className="h-full w-full bg-primary/10">
                  <Icon name="User" className="m-auto text-primary" size={22} />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">
                  {(data?.address as any)?.name || "Customer"}
                </Text>
                <Text className="text-sm font-medium text-muted-foreground">
                  Customer
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable className="rounded-full bg-primary/10 p-2">
                  <Icon name="Phone" className="text-primary" size={18} />
                </Pressable>
                <Pressable className="rounded-full bg-primary/10 p-2">
                  <Icon name="Mail" className="text-primary" size={18} />
                </Pressable>
              </View>
            </View>

            <View className="flex-row items-start gap-3 rounded-xl border border-border bg-card p-3">
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="MapPin" className="text-primary" size={20} />
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-base font-bold leading-tight text-foreground">
                  {addressLine1 || "Address unavailable"}
                </Text>
                <Text className="mt-0.5 text-sm font-medium text-muted-foreground">
                  {addressLine2 || (data?.address as any)?.phoneNo || ""}
                </Text>
              </View>
              <Pressable className="mt-1 rounded-full bg-primary/10 p-2">
                <Icon name="LocateIcon" className="text-primary" size={18} />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground">
              Packing List
            </Text>
            <View className="rounded-full bg-primary/10 px-2 py-1">
              <Text className="text-xs font-bold text-primary">
                {items.length} Items
              </Text>
            </View>
          </View>
          <View className="overflow-hidden rounded-xl border border-border">
            {topPackingItems.map((item, index) => (
              <Pressable
                key={item.uid}
                onPress={() => ui.setSelectedItemUid(item.uid)}
                className={`flex-row items-center justify-between bg-card p-4 ${
                  index < topPackingItems.length - 1
                    ? "border-b border-border"
                    : ""
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon
                      name="HardHat"
                      className="text-muted-foreground"
                      size={18}
                    />
                  </View>
                  <Text className="max-w-[220px] text-sm font-medium text-foreground">
                    {item.title}
                  </Text>
                </View>
                <Text className="text-base font-bold text-foreground">
                  x {totalQty(item.deliverableQty)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => {
                if (!packableItems.length) {
                  Toast.show("No packing items available.", {
                    type: "warning",
                  });
                  return;
                }
                setPackingSlipOpen(true);
              }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            >
              <Icon
                name="CheckSquare"
                className="text-primary-foreground"
                size={18}
              />
              <Text className="text-sm font-bold text-primary-foreground">
                Update Packing
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                if (!order?.id || !dispatch?.id) return;
                try {
                  await packing.onClearPackings({
                    salesId: order.id,
                    dispatchId: dispatch.id,
                  });
                  Toast.show("Packing reset", { type: "success" });
                } catch {
                  Toast.show("Unable to reset packing", { type: "error" });
                }
              }}
              disabled={!canEditPacking || packing.taskTrigger.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border py-3 disabled:opacity-50"
            >
              <Icon name="Loader2" className="text-foreground" size={18} />
              <Text className="text-sm font-bold text-foreground">
                Reset Packing
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-4 pb-8">
          <Text className="mb-4 text-xl font-bold text-foreground">
            Activity History
          </Text>
          <View className="gap-6 rounded-xl bg-card p-2">
            {timelineItems.map((event, index) => (
              <View key={event.id} className="flex-row items-center gap-3">
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    event.active ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Icon
                    name={event.icon as any}
                    className={
                      event.active
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }
                    size={16}
                  />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">
                    {event.title}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {event.subtitle}
                  </Text>
                </View>
                {index < timelineItems.length - 1 ? (
                  <View className="absolute left-5 top-10 h-8 w-px bg-border" />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <BlurView intensity={90} className="border-t border-border">
        <View
          className="px-5 pt-3"
          style={{ paddingBottom: Math.max(20, insets.bottom + 16) }}
        >
          <View className="flex-row gap-3">
            <Pressable
              onPress={onIssue}
              disabled={actions.cancelDispatch.isPending}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border disabled:opacity-50"
            >
              <Icon name="AlertCircle" className="text-foreground" size={18} />
              <Text className="font-bold text-foreground">Issue</Text>
            </Pressable>
            <Pressable
              onPress={onMarkDelivered}
              disabled={actions.submitDispatch.isPending || !canComplete}
              className="h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-primary disabled:opacity-50"
            >
              <Icon
                name="CheckSquare"
                className="text-primary-foreground"
                size={18}
              />
              <Text className="font-bold text-primary-foreground">
                Mark Delivered
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>

      {isPackingSlipOpen ? (
        <View className="absolute inset-0 z-40 bg-background">
          <View
            className="border-b border-border bg-card px-4 pb-3"
            style={{ paddingTop: insets.top + 6 }}
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setPackingSlipOpen(false)}
                className="h-10 w-10 items-center justify-center"
              >
                <Icon name="ArrowLeft" className="text-foreground" size={20} />
              </Pressable>
              <Text className="flex-1 text-center text-lg font-bold tracking-tight text-foreground">
                Packing Slip
              </Text>
              <Pressable className="h-10 w-10 items-center justify-center">
                <Icon
                  name="Search"
                  className="text-muted-foreground"
                  size={19}
                />
              </Pressable>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-44 pt-4"
          >
            <View className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <View className="mb-3 flex-row items-start justify-between">
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-primary/75">
                    Order ID
                  </Text>
                  <Text className="mt-1 text-xl font-black text-foreground">
                    {order?.orderId ? `#${order.orderId}` : pageTitle}
                  </Text>
                </View>
                <View className="rounded-full bg-primary/15 px-3 py-1">
                  <Text className="text-[11px] font-bold capitalize text-primary">
                    {statusText}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3">
                <View className="h-14 w-14 items-center justify-center rounded-xl bg-muted">
                  <Icon name="HardHat" className="text-foreground" size={22} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {topPackingItems[0]?.title || "Packed Components"}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Industrial Grade - Mixed Components
                  </Text>
                </View>
              </View>
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-[1.3px] text-muted-foreground">
                Items to Pack
              </Text>
              <Pressable
                onPress={() => {
                  setConfirmPackAllChecked(false);
                  presentPackAllModal();
                }}
                className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5"
              >
                <Icon name="Plus" className="text-primary" size={14} />
                <Text className="text-xs font-bold text-primary">Pack All</Text>
              </Pressable>
            </View>

            {packableItems.map((item) => {
              const draft = packingDrafts[item.uid] || {
                checked: false,
                qty: 0,
                lh: 0,
                rh: 0,
              };
              const deliverable = (item.deliverableQty || {}) as any;
              const hasSingle = itemHasSingleQty(item);
              const maxQty = asNumber(deliverable.qty);
              const maxLh = asNumber(deliverable.lh);
              const maxRh = asNumber(deliverable.rh);

              return (
                <View
                  key={item.uid}
                  className="mb-4 rounded-2xl border border-border bg-card p-4"
                >
                  <View className="mb-3 flex-row items-start gap-3">
                    <Pressable
                      onPress={() =>
                        updateDraft(item.uid, (prev) => {
                          const checked = !prev.checked;
                          return checked
                            ? { ...prev, checked: true }
                            : { ...prev, checked: false, qty: 0, lh: 0, rh: 0 };
                        })
                      }
                      className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
                        draft.checked
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {draft.checked ? (
                        <Icon
                          name="Check"
                          className="text-primary-foreground"
                          size={13}
                        />
                      ) : null}
                    </Pressable>
                    <View className="flex-1">
                      <Text className="text-base font-semibold leading-tight text-foreground">
                        {item.title}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        Ref: {item.uid}
                      </Text>
                    </View>
                  </View>

                  {hasSingle ? (
                    <View className="rounded-xl bg-muted/70 p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-muted-foreground">
                          Packed Qty
                        </Text>
                        <View
                          className={`flex-row items-center gap-3 ${!draft.checked ? "opacity-40" : ""}`}
                        >
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() => adjustSingle(item.uid, maxQty, -1)}
                            className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
                          >
                            <Icon
                              name="Minus"
                              className="text-foreground"
                              size={16}
                            />
                          </Pressable>
                          <Text className="min-w-[28px] text-center text-lg font-bold text-foreground">
                            {draft.qty}
                          </Text>
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() => adjustSingle(item.uid, maxQty, 1)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-primary"
                          >
                            <Icon
                              name="Plus"
                              className="text-primary-foreground"
                              size={16}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="mt-1 flex-row gap-3">
                      <View
                        className={`flex-1 rounded-xl bg-muted/70 p-3 ${!draft.checked ? "opacity-40" : ""}`}
                      >
                        <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                          LH Qty
                        </Text>
                        <View className="mt-2 flex-row items-center justify-between">
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() =>
                              adjustSide(item.uid, "lh", maxLh, -1)
                            }
                            className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                          >
                            <Icon
                              name="Minus"
                              className="text-foreground"
                              size={14}
                            />
                          </Pressable>
                          <Text className="text-base font-bold text-foreground">
                            {draft.lh}
                          </Text>
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() => adjustSide(item.uid, "lh", maxLh, 1)}
                            className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                          >
                            <Icon
                              name="Plus"
                              className="text-foreground"
                              size={14}
                            />
                          </Pressable>
                        </View>
                      </View>
                      <View
                        className={`flex-1 rounded-xl bg-muted/70 p-3 ${!draft.checked ? "opacity-40" : ""}`}
                      >
                        <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                          RH Qty
                        </Text>
                        <View className="mt-2 flex-row items-center justify-between">
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() =>
                              adjustSide(item.uid, "rh", maxRh, -1)
                            }
                            className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                          >
                            <Icon
                              name="Minus"
                              className="text-foreground"
                              size={14}
                            />
                          </Pressable>
                          <Text className="text-base font-bold text-foreground">
                            {draft.rh}
                          </Text>
                          <Pressable
                            disabled={!draft.checked}
                            onPress={() => adjustSide(item.uid, "rh", maxRh, 1)}
                            className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                          >
                            <Icon
                              name="Plus"
                              className="text-foreground"
                              size={14}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <BlurView
            intensity={90}
            className="absolute bottom-0 left-0 right-0 border-t border-border"
          >
            <View
              className="px-4 pt-3"
              style={{ paddingBottom: Math.max(22, insets.bottom + 14) }}
            >
              <ProgressBar
                label="Progress"
                info="Packed"
                value={progressPacked}
                max={packableItems.length}
                className="mb-5"
                trackClassName="h-2"
              />
              <Pressable
                disabled={packing.taskTrigger.isPending}
                onPress={onConfirmPackingSlip}
                className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                <Icon
                  name="Truck"
                  className="text-primary-foreground"
                  size={18}
                />
                <Text className="text-base font-bold text-primary-foreground">
                  {packing.taskTrigger.isPending
                    ? "Saving..."
                    : "Confirm & Start Trip"}
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      ) : null}

      <SheetModal
        ref={completeModalRef}
        title="Complete Dispatch"
        snapPoints={completeSnapPoints}
        onDismiss={() => ui.setCompleteSheetOpen(false)}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <DispatchCompleteForm
            isSubmitting={actions.submitDispatch.isPending}
            onCancel={() => ui.setCompleteSheetOpen(false)}
            onSubmit={async (input) => {
              if (!order?.id || !dispatch?.id) return;
              try {
                await actions.onSubmitDispatch({
                  salesId: order.id,
                  dispatchId: dispatch.id,
                  ...input,
                });
                ui.setCompleteSheetOpen(false);
                Toast.show("Dispatch completed", { type: "success" });
              } catch {
                Toast.show("Unable to complete dispatch", { type: "error" });
              }
            }}
          />
        </BottomSheetScrollView>
      </SheetModal>

      <SheetModal
        ref={packAllModalRef}
        title="Confirm Pack All"
        snapPoints={packAllSnapPoints}
        onDismiss={() => {
          setConfirmPackAllChecked(false);
          setPackOnlyAvailableChecked(true);
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <Text className="text-center text-base text-muted-foreground">
            Are you sure you want to pack all items currently pending
            production?
          </Text>

          <View className="mt-5">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">
              Pending Production ({pendingPackAllItems.length})
            </Text>
            <View className="gap-2">
              {productionPackAllItems.map((item) => (
                <View
                  key={item.uid}
                  className="rounded-xl border border-border bg-muted/40 p-4"
                >
                  <View className="flex-row items-center gap-4">
                    <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon
                        name="ClipboardList"
                        className="text-primary"
                        size={20}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {item.title}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="text-[11px] font-semibold text-primary">
                        Available completed: {item.availableCompleted}
                      </Text>
                    </View>
                    <Text className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Pending production: {item.pendingProduction}
                    </Text>
                  </View>
                </View>
              ))}
              {!productionPackAllItems.length ? (
                <View className="rounded-xl border border-border bg-muted/30 p-4">
                  <Text className="text-sm text-muted-foreground">
                    No pending production items left to pack.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => setConfirmPackAllChecked((prev) => !prev)}
            className="mt-6 flex-row items-start gap-3"
          >
            <View
              className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                confirmPackAllChecked
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
            >
              {confirmPackAllChecked ? (
                <Icon
                  name="Check"
                  className="text-primary-foreground"
                  size={13}
                />
              ) : null}
            </View>
            <Text className="flex-1 text-sm font-medium text-foreground">
              I confirm all pending production is ready for packing
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPackOnlyAvailableChecked((prev) => !prev)}
            className="mt-4 flex-row items-start gap-3"
          >
            <View
              className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                packOnlyAvailableChecked
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              }`}
            >
              {packOnlyAvailableChecked ? (
                <Icon
                  name="Check"
                  className="text-primary-foreground"
                  size={13}
                />
              ) : null}
            </View>
            <Text className="flex-1 text-sm font-medium text-foreground">
              Pack only available production completed quantities
            </Text>
          </Pressable>

          <View className="mt-6 gap-3">
            <Pressable
              disabled={
                !confirmPackAllChecked || !productionPackAllItems.length
              }
              onPress={onPackAllDraft}
              className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 disabled:opacity-50"
            >
              <Icon
                name="HardHat"
                className="text-primary-foreground"
                size={18}
              />
              <Text className="font-bold text-primary-foreground">
                Pack All Items
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setConfirmPackAllChecked(false);
                setPackOnlyAvailableChecked(true);
                dismissPackAllModal();
              }}
              className="w-full items-center justify-center rounded-xl bg-muted py-4"
            >
              <Text className="font-semibold text-foreground">Cancel</Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </SheetModal>

      <SheetModal
        ref={packingModalRef}
        title={selectedItem?.title || "Pack Item"}
        snapPoints={packingSnapPoints}
        onDismiss={() => ui.setSelectedItemUid(null)}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {!!selectedItem && (
            <>
              <Text className="mb-2 text-sm text-muted-foreground">
                Add packing qty and review history
              </Text>
              <DispatchPackingForm
                item={selectedItem as any}
                disabled={!canEditPacking}
                isSubmitting={packing.taskTrigger.isPending}
                onSubmit={async (args) => {
                  if (!order?.id || !dispatch?.id) return;
                  try {
                    await packing.onPackItem({
                      salesId: order.id,
                      dispatchId: dispatch.id,
                      salesItemId: selectedItem.salesItemId,
                      enteredQty: args.qty,
                      dispatchStatus: (dispatch.status as any) || "queue",
                      deliverables: (selectedItem.deliverables || []) as any,
                      note: args.note,
                    });
                    Toast.show("Packing saved", { type: "success" });
                    await overview.refetch();
                  } catch {
                    Toast.show("Unable to save packing entry", {
                      type: "error",
                    });
                  }
                }}
              />

              <DispatchPackingHistory
                history={selectedItem.packingHistory || []}
              />
            </>
          )}
        </BottomSheetScrollView>
      </SheetModal>
    </View>
  );
}
