import { InvoiceFormScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import { normalizeSalesFormTypeParam } from "@/features/sales/invoice-form/lib/sales-form-route-params";
import { useLocalSearchParams } from "expo-router";

export default function EditInvoiceRoute() {
  const params = useLocalSearchParams<{ slug?: string; type?: string }>();
  const slug = typeof params.slug === "string" ? params.slug : undefined;
  const type = normalizeSalesFormTypeParam(params.type);

  return <InvoiceFormScreen mode="edit" slug={slug} type={type} />;
}
