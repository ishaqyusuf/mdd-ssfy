"use client";

import { CustomerSalesListColumnVisibility } from "@/components/tables-2/customer-sales-list/column-visibility";
import type { CustomerSalesListRow } from "@/components/tables-2/customer-sales-list/columns";
import { DataTable as CustomerSalesListDataTable } from "@/components/tables-2/customer-sales-list/data-table";

type Props = {
	data?: CustomerSalesListRow[];
	loading?: boolean;
};

export function SalesList({ data, loading = false }: Props) {
	const list = data ?? [];

	return (
		<div className="space-y-2">
			<div className="flex justify-end">
				<CustomerSalesListColumnVisibility />
			</div>
			<CustomerSalesListDataTable data={list} isLoading={loading} />
		</div>
	);
}
