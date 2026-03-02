import { DispatchOverviewItem, QtyMatrix } from "../types/dispatch.types";
import { formatQty } from "../lib/format-dispatch";
import { DispatchPackingForm } from "./dispatch-packing-form";
import { DispatchPackingHistory } from "./dispatch-packing-history";
import { Text, View } from "react-native";

type Props = {
  items: DispatchOverviewItem[];
  canEditPacking: boolean;
  isPackingPending?: boolean;
  isDeletePackingPending?: boolean;
  onSubmitPacking: (
    item: DispatchOverviewItem,
    args: { qty: QtyMatrix; note?: string },
  ) => Promise<void> | void;
  onDeletePacking: (
    item: DispatchOverviewItem,
    historyId?: number | null,
    packingUid?: string | null,
  ) => Promise<void> | void;
};

export function DispatchItemList({
  items,
  canEditPacking,
  isPackingPending,
  isDeletePackingPending,
  onSubmitPacking,
  onDeletePacking,
}: Props) {
  return (
    <View className="gap-3">
      {items?.map((item) => (
        <View key={item.uid} className="rounded-2xl border border-border bg-card p-4">
          <Text className="text-base font-semibold text-foreground">
            {item.title}
          </Text>
          {!!item.subtitle && (
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {item.subtitle}
            </Text>
          )}

          <View className="mt-2 gap-1">
            <Text className="text-xs text-muted-foreground">
              Deliverable:{" "}
              <Text className="text-foreground">{formatQty(item.deliverableQty)}</Text>
            </Text>
            <Text className="text-xs text-muted-foreground">
              Packed: <Text className="text-foreground">{formatQty(item.listedQty)}</Text>
            </Text>
            <Text className="text-xs text-muted-foreground">
              Remaining:{" "}
              <Text className="text-foreground">{formatQty(item.nonDeliverableQty)}</Text>
            </Text>
          </View>

          {canEditPacking && (
            <DispatchPackingForm
              item={item}
              disabled={!canEditPacking}
              isSubmitting={isPackingPending}
              onSubmit={(args) => onSubmitPacking(item, args)}
            />
          )}

          <DispatchPackingHistory
            history={item.packingHistory || []}
            disabled={!canEditPacking}
            isDeleting={isDeletePackingPending}
            onDelete={(history) =>
              onDeletePacking(item, history.id, history.packingUid)
            }
          />
        </View>
      ))}
    </View>
  );
}
