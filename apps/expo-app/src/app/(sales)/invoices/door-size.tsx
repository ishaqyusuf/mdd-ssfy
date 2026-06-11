import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { DoorSizePickerScreen } from "@/features/sales/invoice-form/components/workflow-step-selector";
import { useInvoiceFormModalStore } from "@/features/sales/invoice-form/store/use-invoice-form-modal-store";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

export default function InvoiceDoorSizeRoute() {
  const router = useRouter();
  const picker = useInvoiceFormModalStore((state) => state.doorSizePicker);
  const pickerRef = useRef(picker);
  const handledCloseRef = useRef(false);

  useEffect(() => {
    pickerRef.current = picker;
  }, [picker]);

  useEffect(
    () => () => {
      if (handledCloseRef.current) return;
      pickerRef.current?.onClose();
    },
    [],
  );

  if (!picker) {
    return (
      <SafeArea>
        <View className="flex-1 bg-background">
          <View className="relative h-14 flex-row items-center justify-between px-3 pt-1">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center active:opacity-60"
            >
              <Icon name="X" className="text-foreground" size={22} />
            </Pressable>
            <View className="pointer-events-none absolute inset-x-14 items-center pt-1">
              <Text className="text-base font-semibold text-foreground">
                Door sizes
              </Text>
            </View>
            <View className="h-11 w-11" />
          </View>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <DoorSizePickerScreen
      {...picker}
      onClose={() => {
        handledCloseRef.current = true;
        picker.onClose();
        router.back();
      }}
      onOk={() => {
        handledCloseRef.current = true;
        picker.onOk();
        router.back();
      }}
      onNextStep={() => {
        handledCloseRef.current = true;
        picker.onNextStep();
        router.back();
      }}
    />
  );
}
