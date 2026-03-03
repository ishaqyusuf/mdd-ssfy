import { useDispatchOverview } from "../api/use-dispatch-overview";
import { useDispatchActions } from "../api/use-dispatch-actions";
import { useDispatchPacking } from "../api/use-dispatch-packing";
import { useDispatchUiState } from "../state/use-dispatch-ui-state";
import { DispatchActionBar } from "./dispatch-action-bar";
import { DispatchCompleteForm } from "./dispatch-complete-form";
import { DispatchItemList } from "./dispatch-item-list";
import { formatDispatchDate, formatQty, totalQty } from "../lib/format-dispatch";
import { Toast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { Modal as SheetModal, useModal } from "@/components/ui/modal";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
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
  const packingSnapPoints = useMemo(() => ["70%"], []);
  const completeSnapPoints = useMemo(() => ["85%"], []);

  useEffect(() => {
    if (selectedItem) {
      presentPackingModal();
    } else {
      dismissPackingModal();
    }
  }, [selectedItem, presentPackingModal, dismissPackingModal]);

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
  const dispatchStats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + totalQty(item.deliverableQty), 0);
    const packed = items.reduce((sum, item) => sum + totalQty(item.listedQty), 0);
    const pending = Math.max(0, total - packed);
    return { packed, pending, total };
  }, [items]);

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
        className="border-b border-border bg-card px-4 pb-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-secondary active:opacity-80"
            >
              <Icon name="ArrowLeft" className="size-18 text-foreground" />
            </Pressable>
            <View>
              <Text className="text-lg font-bold text-foreground">
                {pageTitle}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Dispatch Details
              </Text>
            </View>
          </View>
          <View className="rounded-full border border-border bg-secondary px-3 py-1.5">
            <Text className="text-xs font-semibold capitalize text-foreground">
              {dispatch?.status || "queue"}
            </Text>
          </View>
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
        <DispatchActionBar
          status={dispatch?.status}
          isStarting={actions.startDispatch.isPending}
          isCancelling={actions.cancelDispatch.isPending}
          isSubmitting={actions.submitDispatch.isPending}
          isClearingPacking={packing.taskTrigger.isPending}
          canStart={actions.canStart(dispatch?.status)}
          canCancel={actions.canCancel(dispatch?.status)}
          canComplete={actions.canComplete(dispatch?.status)}
          canEditPacking={canEditPacking}
          onStart={async () => {
            if (!order?.id || !dispatch?.id) return;
            try {
              await actions.onStartDispatch({
                salesId: order.id,
                dispatchId: dispatch.id,
              });
              Toast.show("Dispatch started", { type: "success" });
            } catch {
              Toast.show("Unable to start dispatch", { type: "error" });
            }
          }}
          onCancel={async () => {
            if (!order?.id || !dispatch?.id) return;
            try {
              await actions.onCancelDispatch({
                salesId: order.id,
                dispatchId: dispatch.id,
              });
              Toast.show("Dispatch cancelled", { type: "success" });
            } catch {
              Toast.show("Unable to cancel dispatch", { type: "error" });
            }
          }}
          onComplete={() => ui.setCompleteSheetOpen(true)}
          onClearPacking={async () => {
            if (!order?.id || !dispatch?.id) return;
            try {
              await packing.onClearPackings({
                salesId: order.id,
                dispatchId: dispatch.id,
              });
              Toast.show("Packing cleared", { type: "success" });
            } catch {
              Toast.show("Unable to clear packing", { type: "error" });
            }
          }}
        />

        <View className="mb-4 rounded-2xl border border-border bg-card p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Icon name="ChartNoAxesColumn" className="size-14 text-muted-foreground" />
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dispatch Stats
            </Text>
          </View>
          <View className="flex-row items-stretch rounded-xl border border-border bg-background">
            <View className="flex-1 items-center px-3 py-4">
              <Text className="text-2xl font-extrabold text-foreground">
                {dispatchStats.packed}
              </Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                Packed
              </Text>
            </View>
            <View className="w-px bg-border" />
            <View className="flex-1 items-center px-3 py-4">
              <Text className="text-2xl font-extrabold text-foreground">
                {dispatchStats.pending}
              </Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                Pending
              </Text>
            </View>
            <View className="w-px bg-border" />
            <View className="flex-1 items-center px-3 py-4">
              <Text className="text-2xl font-extrabold text-foreground">
                {dispatchStats.total}
              </Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-muted-foreground">
                Total
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-4 rounded-2xl border border-border bg-card p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Icon name="MapPin" className="size-14 text-muted-foreground" />
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Customer & Location
            </Text>
          </View>

          <View className="rounded-xl border border-border bg-background p-4">
            <Text className="text-base font-semibold text-foreground">
              {data?.address?.name || "Customer"}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {order?.orderId ? `Order ${order.orderId}` : "Order N/A"}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {data?.address?.phoneNo || "Phone N/A"}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Icon
                  name="Phone"
                  className="size-14 text-primary-foreground"
                />
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Icon name="MapPin" className="size-14 text-foreground" />
              </View>
            </View>
          </View>
        </View>

        <View className="mb-2 flex-row items-center gap-2">
          <Icon
            name="ClipboardList"
            className="size-14 text-muted-foreground"
          />
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Packing Controls
          </Text>
        </View>
        <DispatchItemList
          items={items}
          onSelectItem={(item) => ui.setSelectedItemUid(item.uid)}
        />

        <View className="mb-4 mt-4 rounded-2xl border border-border bg-card p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Icon name="Clock" className="size-14 text-muted-foreground" />
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Activity History
            </Text>
          </View>

          <View className="rounded-xl border border-border bg-background p-4">
            <View className="mb-4 flex-row gap-3">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-secondary">
                <Icon name="Check" className="size-14 text-foreground" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-foreground">
                  Dispatch Opened
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatDispatchDate(dispatch?.dueDate)}
                </Text>
              </View>
            </View>
            {activityHistory.map((event) => (
              <View key={event.id} className="mb-4 flex-row gap-3">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-secondary">
                  <Icon
                    name="CircleCheck"
                    className="size-14 text-foreground"
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-foreground">
                    Packing Updated
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {event.packedBy || "System"} •{" "}
                    {formatDispatchDate(event.date as any)}
                  </Text>
                </View>
              </View>
            ))}
            {dispatch?.status === "completed" && (
              <View className="flex-row gap-3">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Icon
                    name="Check"
                    className="size-14 text-primary-foreground"
                  />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-foreground">
                    Delivery Completed
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Completed dispatch workflow
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {dispatch?.status === "completed" && (
          <View className="mb-4 rounded-2xl border border-border bg-card p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <Icon
                name="CheckSquare"
                className="size-14 text-muted-foreground"
              />
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Delivery Summary
              </Text>
            </View>

            <View className="rounded-xl border border-border bg-background p-4">
              <View className="mb-3 flex-row justify-between">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Dispatch
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {dispatch?.id ? `#${dispatch.id}` : "N/A"}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Due Date
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatDispatchDate(dispatch?.dueDate)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Packed Totals
              </Text>
              <Text className="mt-1 text-sm text-foreground">
                {items.length} item(s) •{" "}
                {items.map((it) => formatQty(it.listedQty)).join(" / ")}
              </Text>
            </View>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

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
