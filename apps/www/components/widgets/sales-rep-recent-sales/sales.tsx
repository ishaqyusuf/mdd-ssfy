"use client";

import {
    GetSalesListDta,
    GetSalesOrdersDta,
} from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { columns } from "@/components/tables/sales-orders/columns";
import { useSimpleTable } from "@/hooks/use-simple-table";

import { Table, TableBody } from "@gnd/ui/table";

import { EmptyState } from "./empty-state";
import { SalesRow, SalesTableRow } from "./sales-row";
import { SalesTableHeader } from "./sales-table-header";

type Props = {
    sales: GetSalesOrdersDta["data"];
};

export function Sales({ sales }: Props) {
    const { table } = useSimpleTable({
        initialData: sales,
        columns,
    });
    // table.getAllColumns().map(a => a.id == )
    return (
        <div>
            <Table>
                <SalesTableHeader />
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <SalesTableRow key={row.id} row={row} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
