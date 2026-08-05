import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useInventoryFulfillmentDashboardSummary(enabled: boolean) {
	const backorders = useQuery(
		_trpc.inventories.salesBackorderQueueSummary.queryOptions({}, { enabled }),
	);
	const partial = useQuery(
		_trpc.inventories.salesPartialShipmentQueueSummary.queryOptions(
			{},
			{ enabled },
		),
	);
	return {
		backorderCount: backorders.data?.totalCount,
		partialCount: partial.data?.totalCount,
		isPending: backorders.isPending || partial.isPending,
	};
}
