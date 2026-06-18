import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

const salesTypeOptions: Array<{
  type: NewSalesFormType;
  title: string;
  description: string;
  icon: "ReceiptText" | "FileText";
}> = [
  {
    type: "order",
    title: "Sales",
    description: "Create a sales invoice for an order.",
    icon: "ReceiptText",
  },
  {
    type: "quote",
    title: "Quote",
    description: "Prepare a customer quote before approval.",
    icon: "FileText",
  },
];

export function NewSalesTypeSheet() {
  const router = useRouter();
  const { ref, present, dismiss } = useModal();

  const openForm = (type: NewSalesFormType) => {
    dismiss();
    router.push({
      pathname: "/(sales)/invoices/new",
      params: { type },
    } as any);
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
          <Icon name="ChevronRight" className="text-muted-foreground" size={20} />
        </View>
      </Pressable>

      <Modal ref={ref} title="New Invoice" snapPoints={["42%"]}>
        <View className="gap-3 px-4 pb-6 pt-1">
          {salesTypeOptions.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => openForm(option.type)}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Icon name={option.icon} className="text-primary" size={20} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-foreground">
                  {option.title}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </Text>
              </View>
              <Icon name="ChevronRight" className="text-muted-foreground" size={18} />
            </Pressable>
          ))}
          <Button variant="outline" className="mt-1 h-11 rounded-xl" onPress={dismiss}>
            <Text>Cancel</Text>
          </Button>
        </View>
      </Modal>
    </>
  );
}
