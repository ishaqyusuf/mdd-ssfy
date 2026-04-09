"use client";

import { type DataTableProps, TableProvider } from "@/components/tables";
import { TableHeaderComponent } from "@/components/tables/table-header";
import { TableRow } from "@/components/tables/table-row";
import { Table, TableBody } from "@gnd/ui/table";

import { columns } from "./columns";

export function CommissionPaymentsTable(props: DataTableProps) {
	return (
		<TableProvider
			args={[
				{
					columns,
					data: props.data,
				},
			]}
		>
			<div className="overflow-x-auto overscroll-x-none">
				<Table className="min-w-[640px]">
					<TableHeaderComponent />
					<TableBody>
						<TableRow />
					</TableBody>
				</Table>
			</div>
		</TableProvider>
	);
}
