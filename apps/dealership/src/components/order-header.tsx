"use client";

import type { PageFilterData } from "@api/type";
import { CreateSalesBtn } from "./create-sales-btn";
import { SalesCustomTab } from "./sales-custom-tab";
import { SalesOrderExport } from "./sales-order-export";
import { OrderSearchFilter } from "./orders-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function OrderHeader({ initialFilterList }: Props) {
	return (
		<div className="flex flex-wrap items-center gap-3 lg:gap-4">
			<div className="w-full min-w-0 lg:w-[350px]">
				<OrderSearchFilter initialFilterList={initialFilterList} />
			</div>
			<SalesCustomTab />
			<div className="hidden flex-1 lg:block" />
			<SalesOrderExport />
			<CreateSalesBtn />
		</div>
	);
}
