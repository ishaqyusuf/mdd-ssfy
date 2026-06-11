import { InvoiceFormScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import { useLocalSearchParams } from "expo-router";

export default function EditInvoiceRoute() {
  const params = useLocalSearchParams<{ slug?: string; type?: string }>();
  const slug = typeof params.slug === "string" ? params.slug : undefined;
  const type = normalizeSalesFormType(params.type);

  return <InvoiceFormScreen mode="edit" slug={slug} type={type} />;
}

function normalizeSalesFormType(value?: string | string[]): NewSalesFormType {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "quote" ? "quote" : "order";
}
