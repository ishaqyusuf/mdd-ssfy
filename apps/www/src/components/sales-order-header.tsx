"use client";

import type { PageFilterData } from "@api/type";
import { CreateSalesBtn } from "./create-sales-btn";
import { SalesCustomTab } from "./sales-custom-tab";
import { SalesOrderExport } from "./sales-order-export";
import { OrderSearchFilter } from "./sales-order-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function OrderHeader({ initialFilterList }: Props) {
	return (
		<div className="flex gap-4">
			<OrderSearchFilter initialFilterList={initialFilterList} />
			<SalesCustomTab />
			<div className="flex-1" />
			{/* <Table.SummarySlot /> */}
			<SalesOrderExport />
			<CreateSalesBtn />
		</div>
	);
}
