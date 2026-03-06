import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { BottomSheetScrollView, type BottomSheetModal } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Driver = {
  id: number;
  name: string | null;
};

type DeliveryMode = "delivery" | "pickup";
type DeliveryStatus = "queue" | "in progress" | "completed";

type SubmitPayload = {
  deliveryMode: DeliveryMode;
  status: DeliveryStatus;
  dueDate: Date;
  driverId?: number;
};

type Props = {
  drivers: Driver[];
  disabled?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: SubmitPayload) => void;
};

export const CreateDeliveryModal = forwardRef<BottomSheetModal, Props>(
  ({ drivers, disabled, isSubmitting, onCancel, onSubmit }, ref) => {
    const defaultDueDate = useMemo(() => formatDateInput(new Date()), []);
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
    const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>("queue");
    const [driverId, setDriverId] = useState<number | undefined>(undefined);
    const [dueDateInput, setDueDateInput] = useState<string>(defaultDueDate);
    const [dueDateError, setDueDateError] = useState<string | null>(null);
    const snapPoints = useMemo(() => ["72%"], []);
    const resetForm = useCallback(() => {
      setDeliveryMode("delivery");
      setDeliveryStatus("queue");
      setDriverId(undefined);
      setDueDateInput(defaultDueDate);
      setDueDateError(null);
    }, [defaultDueDate]);

    return (
      <Modal ref={ref} title="Create Delivery" snapPoints={snapPoints} onDismiss={resetForm}>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-2 text-xs font-semibold text-muted-foreground">Delivery Mode</Text>
          <View className="mb-3 flex-row gap-2">
            {(["delivery", "pickup"] as const).map((mode) => {
              const active = deliveryMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setDeliveryMode(mode)}
                  className={`rounded-full border px-3 py-2 ${
                    active ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 text-xs font-semibold text-muted-foreground">Status</Text>
          <View className="mb-3 flex-row gap-2">
            {(["queue", "in progress", "completed"] as const).map((status) => {
              const active = deliveryStatus === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setDeliveryStatus(status)}
                  className={`rounded-full border px-3 py-2 ${
                    active ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 text-xs font-semibold text-muted-foreground">Due Date (YYYY-MM-DD)</Text>
          <View className="mb-3 rounded-xl border border-border bg-background px-3 py-2">
            <View className="flex-row items-center gap-2">
              <Icon name="Calendar" className="text-muted-foreground" size={14} />
              <TextInput
                value={dueDateInput}
                onChangeText={(value) => {
                  setDueDateInput(value);
                  if (dueDateError) {
                    setDueDateError(null);
                  }
                }}
                placeholder="2026-03-06"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-sm text-foreground"
              />
            </View>
          </View>
          {dueDateError ? (
            <Text className="mb-3 text-xs font-medium text-red-500">{dueDateError}</Text>
          ) : null}

          <Text className="mb-2 text-xs font-semibold text-muted-foreground">Assign Driver</Text>
          <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setDriverId(undefined)}
                className={`rounded-full border px-3 py-2 ${
                  !driverId ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <Text className={`text-xs font-semibold ${!driverId ? "text-primary" : "text-foreground"}`}>
                  Unassigned
                </Text>
              </Pressable>
              {drivers.map((driver) => {
                const active = driverId === driver.id;
                return (
                  <Pressable
                    key={driver.id}
                    onPress={() => setDriverId(driver.id)}
                    className={`rounded-full border px-3 py-2 ${
                      active ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                      {driver.name || "Unnamed"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </BottomSheetScrollView>

          <View className="flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-border"
            >
              <Text className="text-sm font-semibold text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={Boolean(disabled || isSubmitting)}
              onPress={() => {
                const dueDate = parseDateInput(dueDateInput);
                if (!dueDate) {
                  setDueDateError("Enter a valid date in YYYY-MM-DD format.");
                  return;
                }

                onSubmit({
                  deliveryMode,
                  status: deliveryStatus,
                  dueDate,
                  driverId,
                });
              }}
              className="h-11 flex-1 items-center justify-center rounded-xl bg-primary disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSubmitting ? "Creating..." : "Create Delivery"}
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </Modal>
    );
  },
);

CreateDeliveryModal.displayName = "CreateDeliveryModal";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(input: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
