"use client";

import { useSortParams } from "@/hooks/use-sort-params";
import { useUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import { useTRPC } from "@/trpc/client";
import type { GetUnitInvoicesSchema } from "@api/db/queries/unit-invoices";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, mobileColumn, type Item } from "./columns";

interface Props {
  defaultFilters?: GetUnitInvoicesSchema;
  embedded?: boolean;
  columns?: ColumnDef<Item>[];
}

export function DataTable(props: Props) {
  const trpc = useTRPC();
  const { filters, hasFilters, setFilters } = useUnitInvoiceFilterParams();
  const { params, setParams } = useSortParams();
  const { setParams: setInvoiceParams } = useUnitInvoiceParams();
  const { data, ref, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
      sort: params.sort,
    },
    route: trpc.community.getUnitInvoices,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });

  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return <EmptyState label={props.embedded ? "Invoices" : undefined} />;
  }

  return (
    <Table.Provider
      args={[
        {
          columns: props.columns || columns,
          mobileColumn,
          data,
          params,
          setParams,
          props: {
            loadMoreRef: ref,
            hasNextPage,
          },
          tableScroll,
          tableMeta: {
            rowClick(id, rowData) {
              setInvoiceParams({
                editUnitInvoiceId: rowData.id,
              });
            },
          },
        },
      ]}
    >
      <div className="flex w-full flex-col gap-4">
        <div
          className="overflow-x-auto overscroll-x-none border-border scrollbar-hide md:border-l md:border-r"
          ref={tableScroll.containerRef}
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
