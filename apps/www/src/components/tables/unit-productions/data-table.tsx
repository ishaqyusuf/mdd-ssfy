"use client";

import { useSortParams } from "@/hooks/use-sort-params";
import { useUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import { useTRPC } from "@/trpc/client";
import type { GetUnitProductionsSchema } from "@api/db/queries/unit-productions";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import type { ColumnDef } from "@tanstack/react-table";
import { BatchActions } from "./batch-actions";
import { columns, mobileColumn, type Item } from "./columns";

interface Props {
  defaultFilters?: GetUnitProductionsSchema;
  embedded?: boolean;
  columns?: ColumnDef<Item>[];
}

export function DataTable(props: Props) {
  const trpc = useTRPC();
  const { filters, hasFilters, setFilters } = useUnitProductionFilterParams();
  const { params, setParams } = useSortParams();
  const { setParams: setUnitProductionParams } = useUnitProductionParams();
  const { data, ref, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
      sort: params.sort,
    },
    route: trpc.community.getUnitProductions,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });

  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return <EmptyState label={props.embedded ? "Production tasks" : undefined} />;
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
          checkbox: true,
          tableMeta: {
            rowClick(id, rowData) {
              setUnitProductionParams({
                openUnitProductionId: rowData.id,
              });
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
        {!props.embedded ? <BatchActions /> : null}
      </div>
    </Table.Provider>
  );
}
