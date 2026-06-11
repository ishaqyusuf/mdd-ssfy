import { InvoiceFormScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import { useLocalSearchParams } from "expo-router";

export default function NewInvoiceRoute() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = normalizeSalesFormType(params.type);

  return <InvoiceFormScreen mode="create" type={type} />;
}

function normalizeSalesFormType(value?: string | string[]): NewSalesFormType {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "quote" ? "quote" : "order";
}
