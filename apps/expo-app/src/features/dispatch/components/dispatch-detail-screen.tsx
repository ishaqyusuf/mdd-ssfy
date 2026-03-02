import { useDispatchOverview } from "../api/use-dispatch-overview";
import { useDispatchActions } from "../api/use-dispatch-actions";
import { useDispatchPacking } from "../api/use-dispatch-packing";
import { useDispatchUiState } from "../state/use-dispatch-ui-state";
import { DispatchActionBar } from "./dispatch-action-bar";
import { DispatchCompleteForm } from "./dispatch-complete-form";
import { DispatchItemList } from "./dispatch-item-list";
import { formatDispatchDate } from "../lib/format-dispatch";
import { Toast } from "@/components/ui/toast";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  dispatchId: number;
  salesNo?: string;
};

export function DispatchDetailScreen({ dispatchId, salesNo }: Props) {
  const router = useRouter();
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
  const items = data?.dispatchItems || [];
  const canEditPacking = packing.canEditPacking(dispatch?.status as any);

  const pageTitle = useMemo(() => {
    return `Dispatch #${dispatch?.id || dispatchId}`;
  }, [dispatch?.id, dispatchId]);

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
    <ScrollView className="flex-1 bg-background px-4 pt-8">
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-foreground">{pageTitle}</Text>
          <Text className="text-xs text-muted-foreground">
            Order {order?.orderId || "-"} | Due {formatDispatchDate(dispatch?.dueDate)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="rounded-full border border-border px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-xs font-semibold text-foreground">Back</Text>
        </Pressable>
      </View>

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

      {ui.isCompleteSheetOpen && (
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
      )}

      <DispatchItemList
        items={items}
        canEditPacking={canEditPacking}
        isPackingPending={packing.taskTrigger.isPending}
        isDeletePackingPending={packing.deletePackingItem.isPending}
        onSubmitPacking={async (item, args) => {
          if (!order?.id || !dispatch?.id) return;
          try {
            await packing.onPackItem({
              salesId: order.id,
              dispatchId: dispatch.id,
              salesItemId: item.salesItemId,
              enteredQty: args.qty,
              dispatchStatus: (dispatch.status as any) || "queue",
              deliverables: (item.deliverables || []) as any,
              note: args.note,
            });
            Toast.show("Packing saved", { type: "success" });
          } catch {
            Toast.show("Unable to save packing entry", { type: "error" });
          }
        }}
        onDeletePacking={async (item, historyId, packingUid) => {
          if (!order?.id) return;
          try {
            await packing.onDeletePackingItem({
              salesId: order.id,
              packingId: historyId,
              packingUid: packingUid,
            });
            Toast.show("Packing entry removed", { type: "success" });
          } catch {
            Toast.show("Unable to remove packing entry", { type: "error" });
          }
        }}
      />

      <View className="h-8" />
    </ScrollView>
  );
}
