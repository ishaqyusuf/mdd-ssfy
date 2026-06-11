import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { USE_MOCK_INVOICE_FORM } from "./config";
import { createMockNewSalesFormRecord } from "../mock-data";
import type { NewSalesFormMobileRecord, NewSalesFormType } from "../types";

export function useInvoiceFormRecord(input: {
  mode: "create" | "edit";
  type?: NewSalesFormType;
  slug?: string;
  customerId?: number | null;
}) {
  const type = input.type || "order";
  const mockRecord = useMemo(() => createMockNewSalesFormRecord(type), [type]);

  const realBootstrap = useQuery(
    _trpc.newSalesForm.bootstrap.queryOptions(
      {
        type,
        customerId: input.customerId || null,
      },
      {
        enabled: !USE_MOCK_INVOICE_FORM && input.mode === "create",
      },
    ),
  );

  const realExisting = useQuery(
    _trpc.newSalesForm.get.queryOptions(
      {
        type,
        slug: input.slug || "",
      },
      {
        enabled: !USE_MOCK_INVOICE_FORM && input.mode === "edit" && !!input.slug,
      },
    ),
  );

  if (USE_MOCK_INVOICE_FORM) {
    return {
      data: mockRecord,
      isPending: false,
      isError: false,
      error: null,
      refetch: async () => ({ data: mockRecord }),
    };
  }

  const query = input.mode === "edit" ? realExisting : realBootstrap;
  return {
    ...query,
    data: query.data as NewSalesFormMobileRecord | undefined,
  };
}
