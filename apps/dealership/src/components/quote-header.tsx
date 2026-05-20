"use client";

import type { PageFilterData } from "@api/type";
import { CreateSalesBtn } from "./create-sales-btn";
import { QuoteSearchFilter } from "./quotes-search-filter";
import { SalesCustomTab } from "./sales-custom-tab";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function QuoteHeader({ initialFilterList }: Props) {
	return (
		<div className="flex items-center gap-4">
			<QuoteSearchFilter initialFilterList={initialFilterList} />
			<div className="flex-1" />
			<SalesCustomTab />
			<CreateSalesBtn quote />
		</div>
	);
}
