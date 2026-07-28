import type { PageFilterData } from "@api/type";
import { CreateSalesBtn } from "./create-sales-btn";
import { SalesCustomTab } from "./sales-custom-tab";
import { SalesQuoteSearchFilter } from "./sales-quote-search-filter";
import { SalesQuotesColumnVisibility } from "./tables-2/sales-quotes/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesQuoteHeader({ initialFilterList }: Props) {
	return (
		<div className="flex flex-col gap-4 xl:flex-row xl:items-center">
			<SalesQuoteSearchFilter initialFilterList={initialFilterList} />
			<div className="flex flex-wrap items-center gap-2">
				<SalesQuotesColumnVisibility />
				<SalesCustomTab />
				<CreateSalesBtn quote />
			</div>
		</div>
	);
}
