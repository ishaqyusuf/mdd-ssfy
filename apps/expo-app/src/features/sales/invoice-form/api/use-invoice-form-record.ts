import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import type { NewSalesFormMobileRecord, NewSalesFormType } from "../types";

export function useInvoiceFormRecord(input: {
  mode: "create" | "edit";
  type?: NewSalesFormType;
  slug?: string;
  customerId?: number | null;
}) {
  const type = input.type || "order";

  const realBootstrap = useQuery(
    _trpc.newSalesForm.bootstrap.queryOptions(
      {
        type,
        customerId: input.customerId || null,
      },
      {
        enabled: input.mode === "create",
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
        enabled: input.mode === "edit" && !!input.slug,
      },
    ),
  );

  const query = input.mode === "edit" ? realExisting : realBootstrap;
  return {
    ...query,
    data: query.data as NewSalesFormMobileRecord | undefined,
  };
}
