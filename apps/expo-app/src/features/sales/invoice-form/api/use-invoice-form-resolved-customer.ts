import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { invoiceCustomers } from "../mock-data";
import type { InvoiceResolvedCustomer } from "../types";
import { USE_MOCK_INVOICE_FORM } from "./config";

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
        enabled: !USE_MOCK_INVOICE_FORM && customerId > 0,
      },
    ),
  );

  const mockCustomer = useMemo(
    () => (USE_MOCK_INVOICE_FORM ? createMockResolvedCustomer(customerId) : null),
    [customerId],
  );

  return {
    ...realCustomer,
    data: USE_MOCK_INVOICE_FORM
      ? mockCustomer
      : (realCustomer.data as InvoiceResolvedCustomer | undefined),
    isPending: USE_MOCK_INVOICE_FORM ? false : realCustomer.isPending,
  };
}

function createMockResolvedCustomer(
  customerId: number,
): InvoiceResolvedCustomer | null {
  const customer = invoiceCustomers.find((entry) => entry.id === customerId);
  if (!customer) return null;
  return {
    customerId: customer.id,
    profileId: customer.profileId ?? null,
    billingId: customer.billingAddressId,
    shippingId: customer.shippingAddressId,
    netTerm: customer.paymentTerm ?? null,
    taxCode: customer.taxCode ?? null,
    customer: {
      name: customer.contact || customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    billing: {
      id: customer.billingAddressId,
      lines: [customer.billingAddress],
    },
    shipping: {
      id: customer.shippingAddressId,
      lines: [customer.shippingAddress],
    },
  };
}
