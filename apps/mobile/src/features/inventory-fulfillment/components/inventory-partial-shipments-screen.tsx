import { useInventoryFulfillmentFilters } from "../api/use-inventory-fulfillment-filters";
import { useInventoryPartialShipmentQueue } from "../api/use-inventory-partial-shipment-queue";
import { InventoryFulfillmentScreen } from "./inventory-fulfillment-screen";

export function InventoryPartialShipmentsScreen() {
	const filterState = useInventoryFulfillmentFilters("partial-shipments");
	const query = useInventoryPartialShipmentQueue(filterState.filters);
	return (
		<InventoryFulfillmentScreen
			mode="partial-shipments"
			title="Partial shipments"
			subtitle="Ship available quantities or hold lines until complete"
			{...filterState}
			items={query.items}
			metrics={[
				{ label: "Lines", value: query.summary?.totalCount },
				{
					label: "Available",
					value: query.summary?.availableToShipQty,
					tone: "success",
				},
				{ label: "Held", value: query.summary?.heldLineCount },
				{ label: "Shippable", value: query.summary?.shippableLineCount },
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
