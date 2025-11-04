"use client";

import { useTRPC } from "@/trpc/client";
import { columns, mobileColumn } from "./columns";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useBacklogFilterParams } from "@/hooks/use-backlog-filter-params";
import { useBacklogParams } from "@/hooks/use-backlog-params";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";

interface Props {
  defaultFilters?: any;
  singlePage?: boolean;
}
export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useBacklogStore();
  const { filters } = useBacklogFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.backlogs.getBacklogs,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });
  const { setParams } = useBacklogParams();
  return (
    <Table.Provider
      args={[
        {
          columns,
          mobileColumn: mobileColumn,
          data,
          checkbox: true,
          tableScroll,
          //  rowSelection,
          props: {
            hasNextPage,
            //  loadMoreRef: props.singlePage ? null : loadMoreRef,
          },
          //  setRowSelection,
          tableMeta: {
            //  rowClick(id, rowData) {
            //      overviewQuery.open2(rowData.uuid, "sales");
            //  },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        <Table.SummaryHeader />
        <div
          ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <Table.TableHeader />
            <Table.Body>
              <Table.TableRow />
            </Table.Body>
          </Table>
        </div>
        <Table.LoadMore />
        {/* <BatchActions /> */}
      </div>
    </Table.Provider>
  );
}
