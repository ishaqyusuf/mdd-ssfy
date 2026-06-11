import { CustomerSelectorScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import { useRouter } from "expo-router";

export default function InvoiceCustomerSelectorRoute() {
  const router = useRouter();
  const actions = useInvoiceFormStore((state) => state.actions);

  return (
    <CustomerSelectorScreen
      onClose={() => router.back()}
      onCustomerSelected={() => {
        actions.setStep("items");
        router.back();
      }}
    />
  );
}
