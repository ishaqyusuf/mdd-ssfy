import { DispatchPackingOverview } from "@/components/dispatch-packing-overview";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function PackingTab({
	packItemsOpen,
	onPackItemsOpenChange,
}: {
	packItemsOpen: boolean;
	onPackItemsOpenChange: (open: boolean) => void;
}) {
	const query = useSalesOverviewQuery();

	return (
		<DispatchPackingOverview
			dispatchId={query?.params?.dispatchId || null}
			packItemsOpen={packItemsOpen}
			salesNo={query.params["sales-overview-id"] || null}
			onPackItemsOpenChange={onPackItemsOpenChange}
		/>
	);
}
