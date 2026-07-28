import { useSalesOrderFilters } from "@/features/sales/api/use-sales-order-filters";
import { useSalesOrdersList } from "@/features/sales/api/use-sales-orders-list";
import type { SalesDocumentListItem } from "./sales-document-list";
import { SalesDocumentListScreen } from "./sales-document-list-screen";

type SalesOrdersListMode = "default" | "dispatch-search";

type SalesOrdersListScreenProps = {
	title?: string;
	subtitle?: string;
	mode?: SalesOrdersListMode;
	onSalesOrderPress?: (item: SalesDocumentListItem) => void;
};

export function SalesOrdersListScreen({
	title = "Orders",
	subtitle = "Search and filter sales orders",
	mode = "default",
	onSalesOrderPress,
}: SalesOrdersListScreenProps = {}) {
	const isDispatchSearchMode = mode === "dispatch-search";

	return (
		<SalesDocumentListScreen
			type="order"
			title={title}
			subtitle={subtitle}
			searchPlaceholder="Search order, customer, phone, PO"
			emptyTitle="No orders found"
			emptyDescription="Adjust search or filters and try again."
			filtersEnabled={!isDispatchSearchMode}
			useList={useSalesOrdersList}
			useFilters={useSalesOrderFilters}
			onDocumentPress={onSalesOrderPress}
		/>
	);
}
