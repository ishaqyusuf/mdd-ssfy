import { BlurView } from "@/components/blur-view";
import { ActivityHistory } from "@/components/chat/activity-history";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useModal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { useAuthContext } from "@/hooks/use-auth";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatchActions } from "../../api/use-dispatch-actions";
import { useDispatchOverview } from "../../api/use-dispatch-overview";
import { useDispatchPacking } from "../../api/use-dispatch-packing";
import { formatDispatchDate, totalQty } from "../../lib/format-dispatch";
import { buildPackingPayload, hasQty } from "../../lib/packing-payload";
import { useDispatchUiState } from "../../state/use-dispatch-ui-state";
import { DispatchDetailProvider, useDispatchDetailContext } from "./context";
import { useDispatchDetailUiState } from "./hooks/use-dispatch-detail-ui-state";
import { usePackingSlipDrafts } from "./hooks/use-packing-slip-drafts";
import { useSalesRequestPacking } from "./hooks/use-sales-request-packing";
import { resolveItemImage } from "./lib/resolve-item-image";
import { DispatchPackingDelayModal } from "./modals/dispatch-packing-delay-modal";
import { ImagePreviewModal } from "./modals/image-preview-modal";
import { PackingItemModal } from "./modals/packing-item-modal";
import { SalesRequestPackingModal } from "./modals/sales-request-packing-modal";
import { CompleteDispatchScreen } from "./subscreens/complete-dispatch-screen";
import { DispatchConfirmScreen } from "./subscreens/dispatch-confirm-screen";
import { IssueReportScreen } from "./subscreens/issue-report-screen";
import { PackingSlipScreen } from "./subscreens/packing-slip-screen";
import { StartTripConfirmScreen } from "./subscreens/start-trip-confirm-screen";

type Props = {
  dispatchId: number;
  salesNo?: string;
  openCompleteOnMount?: boolean;
};

function formatDispatchStatusLabel(status?: string | null) {
  if (!status) return "Queue";
  return status
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolvedAvailableQty(item: any) {
  const deliverables = (item?.deliverables || []) as {
    qty?: { qty?: number | null; lh?: number | null; rh?: number | null };
  }[];
  if (deliverables.length) {
    const sum = deliverables.reduce(
      (acc, entry) => ({
        qty: Number(acc.qty || 0) + Number(entry?.qty?.qty || 0),
        lh: Number(acc.lh || 0) + Number(entry?.qty?.lh || 0),
        rh: Number(acc.rh || 0) + Number(entry?.qty?.rh || 0),
      }),
      { qty: 0, lh: 0, rh: 0 },
    );
    if (totalQty(sum as any) > 0) return sum as any;
  }

  const listedQty = (item?.listedQty || {}) as any;
  if (totalQty(listedQty) > 0) return listedQty;

  return (item?.deliverableQty || item?.availableQty || item?.totalQty || {}) as {
    qty?: number | null;
    lh?: number | null;
    rh?: number | null;
  };
}

export function DispatchDetailScreen({
  dispatchId,
  salesNo,
  openCompleteOnMount,
}: Props) {
  const detailUi = useDispatchDetailUiState();
  return (
    <DispatchDetailProvider value={detailUi}>
      <DispatchDetailScreenInner
        dispatchId={dispatchId}
        salesNo={salesNo}
        openCompleteOnMount={openCompleteOnMount}
      />
    </DispatchDetailProvider>
  );
}

function DispatchDetailScreenInner({
  dispatchId,
  salesNo,
  openCompleteOnMount,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuthContext();
  const ui = useDispatchUiState();
  const detailUi = useDispatchDetailContext();
  const actions = useDispatchActions();
  const packing = useDispatchPacking();
  const notification = useNotificationTrigger();
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const overview = useDispatchOverview(
    {
      dispatchId,
      salesNo,
    },
    {
      enabled: !!dispatchId,
    },
  );

  const data = overview.data!;
  const dispatch = data?.dispatch;
  const order = data?.order;
  const duplicateInsight = data?.duplicateInsight;
  const duplicateDispatches = duplicateInsight?.dispatches || [];
  const hasDuplicateDispatch = duplicateInsight?.isDuplicate || false;
  const activeDispatchId = dispatch?.id || dispatchId;
  const items = useMemo(
    () => (data?.dispatchItems || []).filter((item) => !!item.dispatchable),
    [data?.dispatchItems],
  );
  const canEditPacking = packing.canEditPacking(dispatch?.status as any);
  const {
    isPackingSlipOpen,
    setPackingSlipOpen,
    isDispatchConfirmOpen,
    setDispatchConfirmOpen,
    isStartTripConfirmOpen,
    setStartTripConfirmOpen,
    isIssueReportOpen,
    setIssueReportOpen,
    selectedIssueReason,
    setSelectedIssueReason,
    issueDetails,
    setIssueDetails,
  } = detailUi;
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
    ref: salesRequestModalRef,
    present: presentSalesRequestModal,
    dismiss: dismissSalesRequestModal,
  } = useModal();
  const {
    ref: packingDelayModalRef,
    present: presentPackingDelayModal,
    dismiss: dismissPackingDelayModal,
  } = useModal();
  const packingSnapPoints = useMemo(() => ["70%"], []);
  const salesRequestSnapPoints = useMemo(() => ["85%"], []);
  const packingDelaySnapPoints = useMemo(() => ["82%"], []);
  const hasAutoOpenedCompleteRef = useRef(false);
  const [readyLoadingUid, setReadyLoadingUid] = useState<string | null>(null);

  useEffect(() => {
    if (selectedItem) {
      presentPackingModal();
    } else {
      dismissPackingModal();
    }
  }, [selectedItem, presentPackingModal, dismissPackingModal]);

  useEffect(() => {
    if (!isPackingSlipOpen) {
      setDispatchConfirmOpen(false);
    }
  }, [isPackingSlipOpen]);

  useEffect(() => {
    if (!openCompleteOnMount || hasAutoOpenedCompleteRef.current) return;
    if (!dispatch?.id || !order?.id) return;
    hasAutoOpenedCompleteRef.current = true;
    ui.setCompleteSheetOpen(true);
  }, [openCompleteOnMount, dispatch?.id, order?.id, ui]);

  const pageTitle = useMemo(() => {
    return `#DISP-${dispatch?.id || dispatchId}`;
  }, [dispatch?.id, dispatchId]);

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
    const customer = (order as any)?.customer || {};
    return (
      [a?.address1, a?.address2].filter(Boolean).join(", ") ||
      customer?.address ||
      ""
    );
  }, [data?.address, order]);
  const addressLine2 = useMemo(() => {
    const a = (data?.address || {}) as any;
    return (
      [a?.city, a?.state, a?.region?.title, a?.zipCode, a?.country]
        .filter(Boolean)
        .join(", ") || ""
    );
  }, [data?.address]);
  const customerName = useMemo(() => {
    const a = (data?.address || {}) as any;
    const customer = (order as any)?.customer || {};
    return customer?.businessName || customer?.name || a?.name || "Customer";
  }, [data?.address, order]);
  const customerPhone = useMemo(() => {
    const a = (data?.address || {}) as any;
    const customer = (order as any)?.customer || {};
    return a?.phoneNo || customer?.phoneNo || "";
  }, [data?.address, order]);
  const customerEmail = useMemo(() => {
    const a = (data?.address || {}) as any;
    const customer = (order as any)?.customer || {};
    return a?.email || customer?.email || "";
  }, [data?.address, order]);

  const packableItems = useMemo(
    () =>
      items.filter(
        (item) => item?.salesItemId && (item as any)?.shippable !== false,
      ),
    [items],
  );
  const topPackingItems = useMemo(() => packableItems, [packableItems]);
  const unpackableItems = useMemo(
    () =>
      packableItems.filter((item) => {
        const unavailable = (item as any).nonDeliverableQty || {};
        return (
          Number(unavailable.qty || 0) > 0 ||
          Number(unavailable.lh || 0) > 0 ||
          Number(unavailable.rh || 0) > 0
        );
      }),
    [packableItems],
  );
  const {
    getSelection: getSalesRequestSelection,
    setSelected: setSalesRequestSelected,
    setQty: setSalesRequestQty,
    markAll: markAllSalesRequestItems,
    selectedItems: selectedSalesRequestItems,
    reset: resetSalesRequestState,
    parseQtyInput: parseSalesRequestQtyInput,
    asNumber: asSalesRequestNumber,
    hasSingleQty: hasSingleSalesRequestQty,
  } = useSalesRequestPacking(unpackableItems);
  const pendingProductionItems = useMemo(
    () =>
      unpackableItems.map((item) => ({
        uid: String(item.uid),
        title: String(item.title || "Item"),
        img: (item as any).img || null,
        salesItemId: (item as any).salesItemId as number | undefined,
        pendingQty: {
          qty:
            Number(((item as any).nonDeliverableQty || {}).qty || 0) ||
            undefined,
          lh:
            Number(((item as any).nonDeliverableQty || {}).lh || 0) ||
            undefined,
          rh:
            Number(((item as any).nonDeliverableQty || {}).rh || 0) ||
            undefined,
        },
      })),
    [unpackableItems],
  );
  const {
    packingDrafts,
    setPackingDrafts,
    adjustSingle,
    setSingleValue,
    adjustSide,
    setSideValue,
    progressPacked,
    progressTotal,
    parseQtyInput,
    asNumber,
    itemHasSingleQty,
  } = usePackingSlipDrafts({
    isOpen: isPackingSlipOpen,
    packableItems,
  });

  const issueReasons = useMemo(
    () => [
      {
        key: "wrong_address",
        title: "Wrong Address",
        subtitle: "The GPS location is incorrect",
        icon: "MapPin",
      },
      {
        key: "customer_not_home",
        title: "Customer Not Home",
        subtitle: "No answer at door or phone",
        icon: "User",
      },
      {
        key: "damaged_items",
        title: "Damaged Items",
        subtitle: "Package is broken or leaking",
        icon: "HardHat",
      },
      {
        key: "access_issue",
        title: "Access Issue",
        subtitle: "Gate code required or road closed",
        icon: "Lock",
      },
      {
        key: "other",
        title: "Other",
        subtitle: "Something else went wrong",
        icon: "more",
      },
    ],
    [],
  );

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
    setIssueReportOpen(true);
  };

  const onSubmitSalesRequestPacking = async () => {
    if (!dispatch?.id) return;
    if (!selectedSalesRequestItems.length) {
      Toast.show("Select at least one item and quantity.", { type: "warning" });
      return;
    }

    const packingLines = selectedSalesRequestItems.flatMap(({ item, qty }) => {
      const built = buildPackingPayload({
        salesItemId: item.salesItemId,
        enteredQty: qty,
        deliverables: (item.deliverables || []) as any,
        note: "Requested via sales_request_packing",
      });
      return built.packingLines;
    });

    try {
      await notification.send("sales_request_packing", {
        payload: {
          orderNo: String(order?.orderId || pageTitle),
          dispatchId: dispatch.id,
          packItems: {
            dispatchId: dispatch.id,
            dispatchStatus: ((dispatch.status as any) || "queue") as any,
            packMode: "selection",
            packingLines,
          },
        },
      } as any);

      dismissSalesRequestModal();
      resetSalesRequestState();
      Toast.show(
        "Admin has been notified and all items will be automatically packed.",
        { type: "success" },
      );
    } catch {
      Toast.show("Unable to send packing request right now.", {
        type: "error",
      });
    }
  };

  const onMarkPendingProductionReady = async (item: {
    uid: string;
    title: string;
    salesItemId?: number;
    pendingQty: { qty?: number; lh?: number; rh?: number };
  }) => {
    if (!dispatch?.id) return;

    setReadyLoadingUid(item.uid);
    try {
      await notification.send("dispatch_packing_delay", {
        payload: {
          orderNo: String(order?.orderId || pageTitle),
          dispatchId: dispatch.id,
          salesItemId: item.salesItemId,
          itemUid: item.uid,
          itemName: item.title,
          pendingQty: item.pendingQty,
          note: "Driver marked item as ready from pending production popup.",
        },
      });
      Toast.show(`${item.title} marked ready and admin notified.`, {
        type: "success",
      });
    } catch {
      Toast.show("Unable to send ready notification right now.", {
        type: "error",
      });
    } finally {
      setReadyLoadingUid(null);
    }
  };

  const onSubmitIssueReport = async () => {
    if (!order?.id || !dispatch?.id || !canCancel) {
      Toast.show("Issue reporting is unavailable at this dispatch stage.", {
        type: "warning",
      });
      return;
    }
    if (!selectedIssueReason) {
      Toast.show("Select an issue reason to continue.", { type: "warning" });
      return;
    }
    try {
      await actions.onCancelDispatch({
        salesId: order.id,
        dispatchId: dispatch.id,
      });
      setIssueReportOpen(false);
      setSelectedIssueReason(null);
      setIssueDetails("");
      Toast.show("Dispatch marked with issue and cancelled", {
        type: "success",
      });
    } catch {
      Toast.show("Unable to submit issue", { type: "error" });
    }
  };

  const onNotifyDuplicateDispatchToAdmin = async () => {
    if (!activeDispatchId) return;
    try {
      await notification.send("sales_dispatch_duplicate_alert", {
        payload: {
          dispatchId: activeDispatchId,
        },
      });
      Toast.show("Admin has been notified about duplicate dispatch.", {
        type: "success",
      });
    } catch {
      Toast.show("Unable to notify admin right now.", {
        type: "error",
      });
    }
  };

  const packingConfirmItems = useMemo(() => {
    return packableItems.map((item) => {
      const draft = packingDrafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
      const hasSingle = itemHasSingleQty(item);
      const packedTotal = hasSingle ? draft.qty : draft.lh + draft.rh;
      const available = resolvedAvailableQty(item);
      const totalAvailable = hasSingle
        ? asNumber(available.qty)
        : asNumber(available.lh) + asNumber(available.rh);
      const isVerified = packedTotal > 0;
      return {
        uid: item.uid,
        title: item.title,
        img: item.img,
        isVerified,
        packedQty: packedTotal,
        totalQty: totalAvailable,
        icon: isVerified
          ? hasSingle
            ? "HardHat"
            : "ClipboardList"
          : "AlertCircle",
        subtitle: hasSingle
          ? isVerified
            ? `${draft.qty} units`
            : "Skipped from this shipment"
          : isVerified
            ? `${draft.lh} LH, ${draft.rh} RH`
            : "Skipped from this shipment",
      };
    });
  }, [asNumber, itemHasSingleQty, packableItems, packingDrafts]);

  const verifiedPackingCount = useMemo(
    () => packingConfirmItems.filter((item) => item.isVerified).length,
    [packingConfirmItems],
  );

  const verificationPercent = useMemo(() => {
    if (!packingConfirmItems.length) return 0;
    return Math.round(
      (verifiedPackingCount / packingConfirmItems.length) * 100,
    );
  }, [packingConfirmItems.length, verifiedPackingCount]);
  const verifiedPackingQty = useMemo(
    () => packingConfirmItems.reduce((sum, item) => sum + item.packedQty, 0),
    [packingConfirmItems],
  );
  const verificationTotalQty = useMemo(
    () => packingConfirmItems.reduce((sum, item) => sum + item.totalQty, 0),
    [packingConfirmItems],
  );
  const verificationQtyPercent = useMemo(() => {
    if (verificationTotalQty <= 0) return 0;
    return Math.round((verifiedPackingQty / verificationTotalQty) * 100);
  }, [verifiedPackingQty, verificationTotalQty]);

  const onPackAllDraft = () => {
    setPackingDrafts(() =>
      Object.fromEntries(
        packableItems.map((item) => {
          const available = resolvedAvailableQty(item);
          const hasSingle = itemHasSingleQty(item);
          const next = hasSingle
            ? {
                qty: totalQty(available as any),
                lh: 0,
                rh: 0,
              }
            : {
                qty: 0,
                lh: asNumber(available.lh),
                rh: asNumber(available.rh),
              };
          return [item.uid, next];
        }),
      ),
    );
    Toast.show("All item quantities updated to available quantities.", {
      type: "success",
    });
  };

  const buildPackingLinesFromDrafts = (note: string) => {
    return packableItems.flatMap((item) => {
      if (!item.salesItemId) return [];
      const draft = packingDrafts[item.uid] || {
        qty: 0,
        lh: 0,
        rh: 0,
      };
      const hasSingle = itemHasSingleQty(item);
      const enteredQty = hasSingle
        ? { qty: Math.max(0, asNumber(draft.qty)) }
        : {
            lh: Math.max(0, asNumber(draft.lh)),
            rh: Math.max(0, asNumber(draft.rh)),
          };
      const built = buildPackingPayload({
        salesItemId: item.salesItemId,
        enteredQty: enteredQty as any,
        deliverables: (item.deliverables || []) as any,
        note,
      });
      if (hasQty(built.remainder)) {
        throw new Error("Unable to allocate full packing quantity");
      }
      return built.packingLines;
    });
  };

  const savePackingSlip = async (opts?: { closeSlip?: boolean }) => {
    const closeSlip = opts?.closeSlip ?? true;
    if (!order?.id || !dispatch?.id) return;
    try {
      const packingLines = buildPackingLinesFromDrafts("Packed via packing slip");
      if (packingLines.length > 0) {
        await packing.onPackItemsSelection({
          salesId: order.id,
          dispatchId: dispatch.id,
          dispatchStatus: (dispatch.status as any) || "queue",
          replaceExisting: true,
          packingLines,
        });
      } else {
        await packing.onClearPackings({
          salesId: order.id,
          dispatchId: dispatch.id,
        });
      }

      await overview.refetch();
      if (closeSlip) {
        setPackingSlipOpen(false);
      }
      Toast.show("Packing slip updated", { type: "success" });
      return true;
    } catch {
      Toast.show("Unable to update packing slip", { type: "error" });
      return false;
    }
  };

  const onSavePackingDraft = async () => {
    const saved = await savePackingSlip({ closeSlip: false });
    if (saved) setDispatchConfirmOpen(false);
  };

  const onConfirmDispatchAfterPacking = async () => {
    if (!order?.id || !dispatch?.id) return;
    try {
      const packingLines = buildPackingLinesFromDrafts(
        "Packed via dispatch confirm",
      );
      if (packingLines.length > 0) {
        await packing.onPackItemsSelection({
          salesId: order.id,
          dispatchId: dispatch.id,
          dispatchStatus: (dispatch.status as any) || "queue",
          replaceExisting: true,
          packingLines,
        });
      } else {
        await packing.onClearPackings({
          salesId: order.id,
          dispatchId: dispatch.id,
        });
      }
      await overview.refetch();
      setPackingSlipOpen(false);
      setDispatchConfirmOpen(false);
      setStartTripConfirmOpen(true);
      Toast.show("Dispatch confirmed.", { type: "success" });
    } catch {
      Toast.show("Unable to confirm dispatch", { type: "error" });
    }
  };

  const onStartTripFromConfirm = async () => {
    if (!order?.id || !dispatch?.id) return;
    if (!canStart) {
      setStartTripConfirmOpen(false);
      Toast.show("Trip already started.", { type: "success" });
      return;
    }
    try {
      await actions.onStartDispatch({
        salesId: order.id,
        dispatchId: dispatch.id,
      });
      setStartTripConfirmOpen(false);
      Toast.show("Trip started", { type: "success" });
    } catch {
      Toast.show("Unable to start trip", { type: "error" });
    }
  };
  const canStartTripFromConfirm = progressPacked > 0;

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
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 pb-3">
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
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
          }}
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

          {auth.isDriver && hasDuplicateDispatch ? (
            <View className="mb-6 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-4 dark:bg-amber-950/25">
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <Icon
                    name="AlertTriangle"
                    className="text-amber-700 dark:text-amber-300"
                    size={16}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    Duplicate dispatch detected
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
                    This dispatch order has duplicates and may cause
                    malfunction.
                  </Text>
                  <Pressable
                    onPress={onNotifyDuplicateDispatchToAdmin}
                    disabled={notification.isPending}
                    className="mt-3 h-10 items-center justify-center rounded-lg bg-amber-600 px-3 disabled:opacity-60"
                  >
                    <Text className="text-sm font-semibold text-amber-50">
                      {notification.isPending ? "Notifying..." : "Notify Admin"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {auth.isAdmin ? (
            <View className="mb-6 rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">
                  Duplicate Dispatches
                </Text>
                <View
                  className={`rounded-full px-2 py-1 ${
                    hasDuplicateDispatch
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-success/10"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase ${
                      hasDuplicateDispatch
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-success"
                    }`}
                  >
                    {hasDuplicateDispatch ? "Detected" : "No Duplicate"}
                  </Text>
                </View>
              </View>
              {hasDuplicateDispatch ? (
                <View className="mt-3 gap-2">
                  {duplicateDispatches.map((item) => {
                    const isRecommended =
                      item.id === duplicateInsight?.recommendedKeepDispatchId;
                    const isCurrent =
                      item.id === duplicateInsight?.currentDispatchId;
                    return (
                      <View
                        key={item.id}
                        className="rounded-lg border border-border/80 bg-background px-3 py-2"
                      >
                        <View className="flex-row items-center justify-between gap-3">
                          <Text className="text-sm font-semibold text-foreground">
                            #DISP-{item.id}
                          </Text>
                          <Text className="text-xs font-medium capitalize text-muted-foreground">
                            {formatDispatchStatusLabel(item.status)}
                          </Text>
                        </View>
                        <View className="mt-1 flex-row flex-wrap items-center gap-2">
                          {isCurrent ? (
                            <View className="rounded-full bg-primary/10 px-2 py-0.5">
                              <Text className="text-[10px] font-semibold uppercase text-primary">
                                Current
                              </Text>
                            </View>
                          ) : null}
                          {isRecommended ? (
                            <View className="rounded-full bg-success/10 px-2 py-0.5">
                              <Text className="text-[10px] font-semibold uppercase text-success">
                                Recommended Keep
                              </Text>
                            </View>
                          ) : null}
                          <Text className="text-[11px] text-muted-foreground">
                            {item.packedItemCount}/{item.itemCount} items packed
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-2 text-xs text-muted-foreground">
                  No duplicate dispatch found for this sales order.
                </Text>
              )}
            </View>
          ) : null}

          <View className="mb-6">
            <Text className="mb-3 text-xl font-bold text-foreground">
              Delivery Details
            </Text>
            <View className="gap-4">
              <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary/20">
                  <View className="h-full w-full bg-primary/10">
                    <Icon
                      name="User"
                      className="m-auto text-primary"
                      size={22}
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {customerName}
                  </Text>
                  <Text className="text-sm font-medium text-muted-foreground">
                    {customerPhone || customerEmail || "Customer"}
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
                    {addressLine2 || customerPhone || customerEmail || ""}
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
              {topPackingItems.map((item, index) => {
                const itemImage = resolveItemImage(item.img as string | null);
                const deliverableTotal = totalQty(
                  resolvedAvailableQty(item) as any,
                );
                const packedTotal = totalQty((item as any).listedQty as any);
                const unpackedTotal = Math.max(
                  0,
                  deliverableTotal - packedTotal,
                );
                const isPacked = deliverableTotal > 0 && unpackedTotal <= 0;
                return (
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
                      {itemImage ? (
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            setPreviewImageUri(itemImage);
                          }}
                        >
                          <Image
                            source={{ uri: itemImage }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: "#F4F4F5",
                            }}
                            contentFit="cover"
                          />
                        </Pressable>
                      ) : (
                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon
                            name="HardHat"
                            className="text-muted-foreground"
                            size={18}
                          />
                        </View>
                      )}
                      <View className="max-w-[220px]">
                        <Text className="text-sm font-medium text-foreground">
                          {item.title}
                        </Text>
                        <Text className="mt-0.5 text-xs uppercase text-muted-foreground">
                          {item.subtitle ||
                            item.sectionTitle ||
                            "No size/type details"}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end gap-1">
                      <View
                        className={`rounded-full px-2 py-1 ${
                          isPacked ? "bg-success/10" : "bg-warn/10"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase ${
                            isPacked ? "text-success" : "text-warn"
                          }`}
                        >
                          {isPacked ? "Packed" : "Unpacked"}
                        </Text>
                      </View>
                      <Text className="text-xs font-medium text-muted-foreground">
                        {packedTotal}/{deliverableTotal}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-3">
              <Pressable
                disabled={!canEditPacking || packing.taskTrigger.isPending}
                onPress={() => {
                  if (!canEditPacking) {
                    Toast.show(
                      "Packing can only be updated while dispatch is active.",
                      {
                        type: "warning",
                      },
                    );
                    return;
                  }
                  if (!packableItems.length) {
                    if (pendingProductionItems.length > 0) {
                      presentPackingDelayModal();
                    } else {
                      Toast.show("No packing items available.", {
                        type: "warning",
                      });
                    }
                    return;
                  }
                  setPackingSlipOpen(true);
                }}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3 disabled:opacity-50"
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

            {unpackableItems.length > 0 ? (
              <Pressable
                onPress={() => presentSalesRequestModal()}
                className="mt-3 h-11 flex-row items-center justify-center rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30"
              >
                <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Packing not available for {unpackableItems.length} items
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mb-4 pb-8">
            <Text className="mb-4 text-xl font-bold text-foreground">
              Chat History
            </Text>
            <ActivityHistory
              tags={[{ tagName: "dispatchId", tagValue: Number(activeDispatchId) }]}
              emptyText="No chat history yet for this dispatch."
            />
          </View>
        </ScrollView>

        <BlurView intensity={90} className="border-t border-border">
          <View style={{ paddingBottom: Math.max(22, insets.bottom + 14) }}>
            <View className="px-5 pt-3">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={onIssue}
                  disabled={actions.cancelDispatch.isPending}
                  className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border disabled:opacity-50"
                >
                  <Icon
                    name="AlertCircle"
                    className="text-foreground"
                    size={18}
                  />
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
          </View>
        </BlurView>

        {isPackingSlipOpen ? (
          <PackingSlipScreen
            insetsBottom={insets.bottom}
            dispatchLabel={pageTitle}
            customerName={customerName}
            orderId={order?.orderId}
            dueDateText={formatDispatchDate(dispatch?.dueDate as any)}
            statusText={statusText}
            packableItems={packableItems}
            packingDrafts={packingDrafts}
            itemHasSingleQty={itemHasSingleQty as any}
            asNumber={asNumber}
            adjustSingle={adjustSingle}
            setSingleValue={setSingleValue}
            adjustSide={adjustSide}
            setSideValue={setSideValue}
            parseQtyInput={parseQtyInput}
            progressPacked={progressPacked}
            progressTotal={progressTotal}
            isSubmitting={packing.taskTrigger.isPending}
            onClose={() => setPackingSlipOpen(false)}
            onOpenPackAll={onPackAllDraft}
            onConfirmAndStartTrip={() => setDispatchConfirmOpen(true)}
            onImagePress={setPreviewImageUri}
          />
        ) : null}

        {isDispatchConfirmOpen ? (
          <DispatchConfirmScreen
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
            pageTitle={pageTitle}
            orderId={order?.orderId}
            packingConfirmItems={packingConfirmItems as any}
            verifiedPackingCount={verifiedPackingCount}
            verificationPercent={verificationPercent}
            verifiedPackingQty={verifiedPackingQty}
            verificationTotalQty={verificationTotalQty}
            verificationQtyPercent={verificationQtyPercent}
            isSubmitting={packing.taskTrigger.isPending}
            onClose={() => setDispatchConfirmOpen(false)}
            onSaveDraft={onSavePackingDraft}
            onConfirmDispatch={onConfirmDispatchAfterPacking}
            onImagePress={setPreviewImageUri}
          />
        ) : null}

        {isStartTripConfirmOpen ? (
          <StartTripConfirmScreen
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
            pageTitle={pageTitle}
            orderId={order?.orderId}
            addressLine1={addressLine1}
            addressLine2={addressLine2}
            packingConfirmItems={packingConfirmItems as any}
            canStartTripFromConfirm={canStartTripFromConfirm}
            isStarting={actions.startDispatch.isPending}
            onClose={() => setStartTripConfirmOpen(false)}
            onViewOrderDetails={() => {
              setStartTripConfirmOpen(false);
              setPackingSlipOpen(false);
            }}
            onPrimaryAction={() => {
              if (canStartTripFromConfirm) {
                onStartTripFromConfirm();
                return;
              }
              setStartTripConfirmOpen(false);
              setPackingSlipOpen(true);
            }}
            onImagePress={setPreviewImageUri}
          />
        ) : null}

        {isIssueReportOpen ? (
          <IssueReportScreen
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
            pageTitle={pageTitle}
            orderId={order?.orderId}
            issueReasons={issueReasons as any}
            selectedIssueReason={selectedIssueReason}
            issueDetails={issueDetails}
            isSubmitting={actions.cancelDispatch.isPending}
            onClose={() => setIssueReportOpen(false)}
            onSelectReason={setSelectedIssueReason}
            onChangeDetails={setIssueDetails}
            onSubmit={onSubmitIssueReport}
          />
        ) : null}

        {ui.isCompleteSheetOpen ? (
          <CompleteDispatchScreen
            insetsTop={insets.top}
            defaultReceivedBy={customerName || ""}
            isSubmitting={actions.submitDispatch.isPending}
            onClose={() => ui.setCompleteSheetOpen(false)}
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
                Toast.show("Unable to complete dispatch", {
                  type: "error",
                });
              }
            }}
          />
        ) : null}

        <PackingItemModal
          modalRef={packingModalRef}
          snapPoints={packingSnapPoints}
          selectedItem={selectedItem as any}
          canEditPacking={canEditPacking}
          isSubmitting={packing.taskTrigger.isPending}
          salesId={order?.id}
          dispatchId={dispatch?.id}
          dispatchStatus={dispatch?.status}
          onDismiss={() => ui.setSelectedItemUid(null)}
          onPackItem={packing.onPackItem}
          onRefetch={overview.refetch}
        />

        <SalesRequestPackingModal
          modalRef={salesRequestModalRef}
          snapPoints={salesRequestSnapPoints}
          unpackableItems={unpackableItems}
          getSelection={getSalesRequestSelection}
          setSelected={setSalesRequestSelected}
          setQty={setSalesRequestQty}
          markAll={markAllSalesRequestItems}
          parseQtyInput={parseSalesRequestQtyInput}
          asNumber={asSalesRequestNumber}
          hasSingleQty={hasSingleSalesRequestQty}
          isSubmitting={notification.isPending}
          onSubmit={onSubmitSalesRequestPacking}
          onDismiss={() => {
            resetSalesRequestState();
          }}
          onImagePress={setPreviewImageUri}
        />

        <DispatchPackingDelayModal
          modalRef={packingDelayModalRef}
          snapPoints={packingDelaySnapPoints}
          items={pendingProductionItems}
          loadingItemUid={readyLoadingUid}
          onReady={onMarkPendingProductionReady}
          onDismiss={() => {
            setReadyLoadingUid(null);
            dismissPackingDelayModal();
          }}
        />

        <ImagePreviewModal
          visible={!!previewImageUri}
          imageUri={previewImageUri}
          onClose={() => setPreviewImageUri(null)}
        />
      </View>
    </SafeArea>
  );
}
