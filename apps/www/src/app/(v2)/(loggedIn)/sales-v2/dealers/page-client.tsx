"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/app-deps/_components/data-table";
import { TableToolbar } from "@/app-deps/_components/data-table/toolbar";
import { useDataTableColumn2 } from "@/components/common/data-table/columns/use-data-table-columns";

import {
    DealerStatus,
    GetDealersAction,
} from "./action";
import { Cells } from "./cells";

interface Props {
    response?;
    tabResp?;
}
export default function PageClient({ response, tabResp }: Props) {
    const { data, pageCount }: GetDealersAction = use(response);
    const h = useSearchParams();
    const status: DealerStatus = h.get("status") as any;
    const table = useDataTableColumn2(
        data,
        {
            pageCount,
            checkable: false,
            cellVariants: {
                size: "sm",
            },
        },
        (ctx) => [
            ctx.Column("Dealer", Cells.Dealer),
            ...(status == "Pending Approval"
                ? [ctx.ActionColumn(Cells.MainActions)]
                : status == "Rejected"
                ? []
                : status == "Restricted"
                ? []
                : [ctx.ActionColumn(Cells.MainActions)]),
        ]
    );
    return (
        <>
            <section className="content">
                <DataTable {...table.props}>
                    <TableToolbar>
                        <TableToolbar.Search />
                    </TableToolbar>
                    <DataTable.Table />
                    <DataTable.Footer />
                </DataTable>
            </section>
        </>
    );
}
