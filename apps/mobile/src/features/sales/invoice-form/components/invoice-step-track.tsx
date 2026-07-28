import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { invoiceFormSteps } from "../store/use-invoice-form-store";
import type { InvoiceFormStep } from "../types";

const labels: Record<InvoiceFormStep, string> = {
  customer: "Customer",
  details: "Details",
  items: "Items",
  costs: "Costs",
  review: "Review",
};

export function InvoiceStepTrack({ step }: { step: InvoiceFormStep }) {
  const activeIndex = invoiceFormSteps.indexOf(step);

  return (
    <View className="bg-background px-4 py-3">
      <View className="flex-row items-center gap-2">
        {invoiceFormSteps.map((item, index) => {
          const active = index === activeIndex;
          const complete = index < activeIndex;
          return (
            <View key={item} className="min-w-0 flex-1">
              <View
                className={`h-1.5 rounded-full ${
                  active ? "bg-primary" : complete ? "bg-emerald-500" : "bg-muted"
                }`}
              />
              <Text
                numberOfLines={1}
                className={`mt-1 text-center text-[10px] font-semibold ${
                  active
                    ? "text-primary"
                    : complete
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                }`}
              >
                {labels[item]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
