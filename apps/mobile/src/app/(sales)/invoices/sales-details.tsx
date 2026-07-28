import { SalesDetailsScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import { useRouter } from "expo-router";

export default function InvoiceSalesDetailsRoute() {
  const router = useRouter();
  const type = useInvoiceFormStore((state) => state.type);
  const customer = useInvoiceFormStore((state) => state.customer);
  const meta = useInvoiceFormStore((state) => state.meta);
  const summary = useInvoiceFormStore((state) => state.summary);
  const orderId = useInvoiceFormStore((state) => state.orderId);
  const salesId = useInvoiceFormStore((state) => state.salesId);
  const slug = useInvoiceFormStore((state) => state.slug);
  const status = useInvoiceFormStore((state) => state.status);
  const saveStatus = useInvoiceFormStore((state) => state.saveStatus);

  return (
    <SalesDetailsScreen
      onClose={() => router.back()}
      type={type}
      customer={customer}
      meta={meta}
      summary={summary}
      orderId={orderId}
      salesId={salesId}
      slug={slug}
      status={status}
      saveStatus={saveStatus}
    />
  );
}
