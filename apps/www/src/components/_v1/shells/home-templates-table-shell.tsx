"use client";

import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState, useTransition } from "react";
import {
  CheckColumn,
  ColumnHeader,
  Cell,
  PrimaryCellContent,
  DateCellContent,
  SecondaryCellContent,
} from "../columns/base-columns";

import { DataTable2 } from "../data-table/data-table-2";

import { BuilderFilter } from "../filters/builder-filter";

import { IHomeTemplate } from "@/types/community";

export default function HomeTemplatesTableShell<T>({
  data,
  pageInfo,
  searchParams,
}: TableShellProps<IHomeTemplate>) {
  const [isPending, startTransition] = useTransition();

  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const columns = useMemo<ColumnDef<IHomeTemplate, unknown>[]>(
    () => [
      CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
      {
        maxSize: 10,
        id: "id",
        header: ColumnHeader("#/Date"),
        cell: ({ row }) => (
          <Cell>
            <PrimaryCellContent>{row.original.id}</PrimaryCellContent>
            <DateCellContent>{row.original.createdAt}</DateCellContent>
          </Cell>
        ),
      },
      {
        id: "title",
        header: ColumnHeader("Model"),
        cell: ({ row }) => (
          <Cell
            link={"/settings/community/model-template/slug"}
            slug={row.original.slug}
          >
            {/* link={`/community/project/slug`} slug={row.original.slug} */}
            <PrimaryCellContent>{row.original.modelName}</PrimaryCellContent>
            <SecondaryCellContent>
              {row.original.builder?.name}
            </SecondaryCellContent>
          </Cell>
        ),
      },

      {
        id: "projects",
        header: ColumnHeader("Total Units"),
        cell: ({ row }) => (
          <Cell>
            <PrimaryCellContent>
              {row.original._count?.homes}
            </PrimaryCellContent>
          </Cell>
        ),
      },

      {
        accessorKey: "_q",
        enableHiding: false,
      },
      {
        accessorKey: "actions",
        header: ColumnHeader(""),
        size: 15,
        maxSize: 15,
        enableSorting: false,
        // cell: ({ row }) => <OrderRowAction row={row.original} />,
      },
    ], //.filter(Boolean) as any,
    [data, isPending]
  );
  return (
    <DataTable2
      searchParams={searchParams}
      columns={columns}
      pageInfo={pageInfo}
      data={data}
      filterableColumns={[BuilderFilter]}
      searchableColumns={[
        {
          id: "_q" as any,
          title: "title, builder",
        },
      ]}

      //  deleteRowsAction={() => void deleteSelectedRows()}
    />
  );
}
