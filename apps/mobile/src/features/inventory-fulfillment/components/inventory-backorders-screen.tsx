import { useInventoryBackorderQueue } from "../api/use-inventory-backorder-queue";
import { useInventoryFulfillmentFilters } from "../api/use-inventory-fulfillment-filters";
import { InventoryFulfillmentScreen } from "./inventory-fulfillment-screen";

export function InventoryBackordersScreen() {
	const filterState = useInventoryFulfillmentFilters("backorders");
	const query = useInventoryBackorderQueue(filterState.filters);
	return (
		<InventoryFulfillmentScreen
			mode="backorders"
			title="Backorders"
			subtitle="Inbound shortages and remaining shipment lines"
			{...filterState}
			items={query.items}
			metrics={[
				{ label: "Lines", value: query.summary?.totalCount },
				{
					label: "Backordered",
					value: query.summary?.backorderedQty,
					tone: "warning",
				},
				{ label: "Inbound", value: query.summary?.inboundQty },
				{ label: "Remaining", value: query.summary?.remainingQty },
			]}
			isPending={query.isPending}
			isRefetching={query.isRefetching || query.summaryQuery.isRefetching}
			isFetchingNextPage={query.isFetchingNextPage}
			hasNextPage={Boolean(query.hasNextPage)}
			error={query.error}
			onFiltersChange={filterState.setFilters}
			onRefresh={() =>
				Promise.all([query.refetch(), query.summaryQuery.refetch()])
			}
			onLoadMore={query.fetchNextPage}
		/>
	);
}
