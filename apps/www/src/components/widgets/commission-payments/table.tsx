"use client";
import { DataTableProps, TableProvider } from "@/components/tables";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "@/components/tables/table-header";
import { TableRow } from "@/components/tables/table-row";

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
            <div className="">
                <Table>
                    <TableHeaderComponent />
                    <TableBody>
                        <TableRow />
                    </TableBody>
                </Table>
            </div>
        </TableProvider>
    );
}
