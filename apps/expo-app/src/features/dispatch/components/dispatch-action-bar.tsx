import { DispatchStatusBadge } from "./dispatch-status-badge";
import { DispatchClearPackingDialog } from "./dispatch-clear-packing-dialog";
import { Pressable, Text, View } from "react-native";

type Props = {
  status?: string | null;
  isStarting?: boolean;
  isCancelling?: boolean;
  isSubmitting?: boolean;
  isClearingPacking?: boolean;
  canStart?: boolean;
  canCancel?: boolean;
  canComplete?: boolean;
  canEditPacking?: boolean;
  onStart: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onClearPacking: () => void;
};

export function DispatchActionBar(props: Props) {
  return (
    <View className="mb-4 gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">Dispatch Status</Text>
        <DispatchStatusBadge status={props.status} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {props.canStart && (
          <Pressable
            disabled={props.isStarting}
            onPress={props.onStart}
            className="rounded-full bg-blue-600 px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-sm font-semibold text-white">
              {props.isStarting ? "Starting..." : "Start"}
            </Text>
          </Pressable>
        )}

        {props.canCancel && (
          <Pressable
            disabled={props.isCancelling}
            onPress={props.onCancel}
            className="rounded-full border border-orange-400 px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-sm font-semibold text-orange-700">
              {props.isCancelling ? "Cancelling..." : "Cancel"}
            </Text>
          </Pressable>
        )}

        {props.canComplete && (
          <Pressable
            disabled={props.isSubmitting}
            onPress={props.onComplete}
            className="rounded-full bg-green-600 px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-sm font-semibold text-white">
              {props.isSubmitting ? "Submitting..." : "Complete"}
            </Text>
          </Pressable>
        )}

        {props.canEditPacking && (
          <DispatchClearPackingDialog
            disabled={props.isClearingPacking}
            onConfirm={props.onClearPacking}
          />
        )}
      </View>
    </View>
  );
}
