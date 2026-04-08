"use client";

import Link from "next/link";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { columns, mobileColumn } from "./columns";

export function DataTable() {
  const trpc = useTRPC();
  const { filters, hasFilters, setFilters } = useSalesOrdersV2FilterParams();
  const overviewQuery = useSalesOverviewQuery();
  const { data, ref, hasNextPage, isFetching } = useTableData({
    filter: filters,
    route: trpc.sales.getOrdersV2,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });

  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return (
      <EmptyState
        CreateButton={
          <Button asChild size="sm">
            <Link href="/sales-book/create-order">
              <Icons.Add className="mr-2 size-4" />
              <span>New</span>
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <Table.Provider
      args={[
        {
          columns,
          mobileColumn,
          data,
          props: {
            loadMoreRef: ref,
            hasNextPage,
          },
          tableScroll,
          checkbox: true,
          tableMeta: {
            mobileMode: {
              hideHeader: true,
              borderless: true,
            },
            rowClick(_, rowData) {
              overviewQuery.open2(rowData.uuid, "sales");
            },
          },
        },
      ]}
    >
      <div className="flex w-full flex-col gap-4">
        <div
          ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none border-border scrollbar-hide md:border-l md:border-r"
        >
          <Table>
            <Table.TableHeader />
            <Table.Body>
              <Table.TableRow />
            </Table.Body>
          </Table>
        </div>
        <Table.LoadMore />
      </div>
    </Table.Provider>
  );
}
