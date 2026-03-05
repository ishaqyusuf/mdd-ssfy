import { _trpc } from "@/components/static-trpc";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useSalesOrdersList(input: {
  q?: string;
  filters?: Record<string, string | null | undefined>;
}) {
  const q = useDebounce((input.q || "").trim(), 350);

  const queryInput = useMemo(() => {
    const normalized: Record<string, any> = {
      showing: "all sales",
      size: 50,
      q: q || undefined,
    };

    Object.entries(input.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        normalized[key] = value;
      }
    });

    return normalized;
  }, [input.filters, q]);

  return useQuery(_trpc.sales.getOrders.queryOptions(queryInput as any));
}
