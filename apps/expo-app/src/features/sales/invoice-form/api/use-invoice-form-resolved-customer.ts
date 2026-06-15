import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceResolvedCustomer } from "../types";

export function useInvoiceFormResolvedCustomer(input: {
  customerId?: number | null;
  billingId?: number | null;
  shippingId?: number | null;
}) {
  const customerId = Number(input.customerId || 0);
  const realCustomer = useQuery(
    _trpc.newSalesForm.resolveCustomer.queryOptions(
      {
        customerId,
        billingId: input.billingId || null,
        shippingId: input.shippingId || null,
      },
      {
        enabled: customerId > 0,
      },
    ),
  );

  return {
    ...realCustomer,
    data: realCustomer.data as InvoiceResolvedCustomer | undefined,
  };
}
