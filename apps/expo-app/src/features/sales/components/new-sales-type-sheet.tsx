import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import {
  getNewSalesCustomerSelectorRoute,
  newSalesTypeOptions,
} from "./new-sales-type-options";
import { SalesClickListRow } from "./sales-click-list-row";

export function NewSalesTypeSheet() {
  const router = useRouter();
  const { ref, present, dismiss } = useModal();
  const actions = useInvoiceFormStore((state) => state.actions);

  const openForm = (type: NewSalesFormType) => {
    actions.reset();
    actions.setFormType(type);
    dismiss();
    router.push(getNewSalesCustomerSelectorRoute(type) as any);
  };

  return (
    <>
      <Pressable
        onPress={() => present()}
        className="rounded-2xl border border-primary/30 bg-primary/5 p-4 active:opacity-80"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="rounded-full bg-primary p-2">
              <Icon
                name="ReceiptText"
                className="text-primary-foreground"
                size={18}
              />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">
                New Invoice
              </Text>
              <Text className="text-xs text-muted-foreground">
                Start a sales invoice or quote
              </Text>
            </View>
          </View>
          <Icon
            name="ChevronRight"
            className="text-muted-foreground"
            size={20}
          />
        </View>
      </Pressable>

      <Modal ref={ref} hideHeader enableDynamicSizing>
        <BottomSheetView className="px-5 pb-7 pt-3">
          {newSalesTypeOptions.map((option) => (
            <SalesClickListRow
              key={option.type}
              title={option.title}
              subtitle={option.description}
              icon={option.icon}
              onPress={() => openForm(option.type)}
            />
          ))}
          <SalesClickListRow
            title="Cancel"
            subtitle="Return to the sales dashboard"
            icon="X"
            onPress={dismiss}
          />
        </BottomSheetView>
      </Modal>
    </>
  );
}
