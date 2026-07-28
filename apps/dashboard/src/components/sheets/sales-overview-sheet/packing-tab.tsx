import { DispatchPackingOverview } from "@/components/dispatch-packing-overview";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function PackingTab() {
  const query = useSalesOverviewQuery();

  return (
    <DispatchPackingOverview
      dispatchId={query?.params?.dispatchId || null}
      salesNo={query.params["sales-overview-id"] || null}
    />
  );
}
