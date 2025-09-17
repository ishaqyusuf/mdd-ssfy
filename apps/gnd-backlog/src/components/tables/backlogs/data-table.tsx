"use client";

import { useTRPC } from "@/trpc/client";
import { columns, ItemCard, mobileColumn } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "@gnd/ui/data-table/table-header";
import { TableRow } from "@gnd/ui/data-table/table-row";
import { useBacklogFilterParams } from "@/hooks/use-backlog-filter-params";
import { useBacklogParams } from "@/hooks/use-backlog-params";
import { LoadMoreTRPC } from "@gnd/ui/data-table/load-more";
import { TableProvider, useTableData } from "@gnd/ui/custom/data-table/index";

export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useBacklogStore();
  const { filters } = useBacklogFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.sales.index,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });
  const { setParams } = useBacklogParams();
  return (
    <TableProvider
      args={[
        {
          columns,
          // mobileColumn: mobileColumn,
          data,
          // checkbox: true,
          // tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            // rowClick(id, rowData) {
            //   //   overviewQuery.open2(rowData.uuid, "sales");
            //   setParams({
            //     //
            //   });
            // },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data?.map((data) => <ItemCard key={data.id} item={data} />)}
        </div>
        {/* <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <TableHeaderComponent />
            <TableBody>
              <TableRow />
            </TableBody>
          </Table>
        </div> */}
        {hasNextPage && <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />}
        {/* <BatchActions /> */}
      </div>
    </TableProvider>
  );
}
