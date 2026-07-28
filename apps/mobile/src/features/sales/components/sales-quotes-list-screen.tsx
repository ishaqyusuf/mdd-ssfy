import { useSalesQuoteFilters } from "@/features/sales/api/use-sales-quote-filters";
import { useSalesQuotesList } from "@/features/sales/api/use-sales-quotes-list";
import { SalesDocumentListScreen } from "./sales-document-list-screen";

export function SalesQuotesListScreen() {
	return (
		<SalesDocumentListScreen
			type="quote"
			title="Quotes"
			subtitle="Search and manage customer quotes"
			searchPlaceholder="Search quote, customer, phone, PO"
			emptyTitle="No quotes found"
			emptyDescription="Adjust search or filters and try again."
			useList={useSalesQuotesList}
			useFilters={useSalesQuoteFilters}
		/>
	);
}
