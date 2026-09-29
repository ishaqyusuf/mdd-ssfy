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
		<div className="flex flex-wrap items-center gap-3 lg:gap-4">
			<div className="w-full min-w-0 lg:w-[350px]">
				<QuoteSearchFilter initialFilterList={initialFilterList} />
			</div>
			<div className="hidden flex-1 lg:block" />
			<SalesCustomTab />
			<CreateSalesBtn quote />
		</div>
	);
}
