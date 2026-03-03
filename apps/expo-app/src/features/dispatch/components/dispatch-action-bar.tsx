import { DispatchStatusBadge } from "./dispatch-status-badge";
import { DispatchClearPackingDialog } from "./dispatch-clear-packing-dialog";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/icon";

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
        <View className="flex-row items-center gap-2">
          <Icon name="Clock" className="size-14 text-muted-foreground" />
          <Text className="text-sm text-muted-foreground">Dispatch Status</Text>
        </View>
        <DispatchStatusBadge status={props.status} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {props.canStart && (
          <Pressable
            disabled={props.isStarting}
            onPress={props.onStart}
            className="rounded-full bg-primary px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <View className="flex-row items-center gap-1">
              <Icon name="CircleCheck" className="size-14 text-primary-foreground" />
              <Text className="text-sm font-semibold text-primary-foreground">
              {props.isStarting ? "Starting..." : "Start"}
              </Text>
            </View>
          </Pressable>
        )}

        {props.canCancel && (
          <Pressable
            disabled={props.isCancelling}
            onPress={props.onCancel}
            className="rounded-full border border-destructive bg-background px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <View className="flex-row items-center gap-1">
              <Icon name="XCircle" className="size-14 text-destructive" />
              <Text className="text-sm font-semibold text-destructive">
              {props.isCancelling ? "Cancelling..." : "Cancel"}
              </Text>
            </View>
          </Pressable>
        )}

        {props.canComplete && (
          <Pressable
            disabled={props.isSubmitting}
            onPress={props.onComplete}
            className="rounded-full bg-accent px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            <View className="flex-row items-center gap-1">
              <Icon name="CheckSquare" className="size-14 text-accent-foreground" />
              <Text className="text-sm font-semibold text-accent-foreground">
              {props.isSubmitting ? "Submitting..." : "Complete"}
              </Text>
            </View>
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
