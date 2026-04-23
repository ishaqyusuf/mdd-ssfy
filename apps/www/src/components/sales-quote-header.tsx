import type { PageFilterData } from "@api/type";
import { CreateSalesBtn } from "./create-sales-btn";
import { SalesCustomTab } from "./sales-custom-tab";
import { SalesQuoteSearchFilter } from "./sales-quote-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesQuoteHeader({ initialFilterList }: Props) {
	return (
		<div className="flex gap-4 items-center">
			<SalesQuoteSearchFilter initialFilterList={initialFilterList} />
			<div className="flex-1" />
			<SalesCustomTab />
			<CreateSalesBtn quote />
		</div>
	);
}
