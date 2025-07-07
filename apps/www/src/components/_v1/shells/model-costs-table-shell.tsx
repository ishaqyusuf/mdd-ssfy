"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteHomeTemplateAction } from "@/app/(v1)/(loggedIn)/settings/community/_components/home-template";
import { openModal } from "@/lib/modal";
import { cn } from "@/lib/utils";
import { ICostChart, IHomeTemplate } from "@/types/community";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@gnd/ui/button";

import { Badge } from "@gnd/ui/badge";
import {
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import InstallCostCell from "../community/install-cost-cell";
import ModelCostCell from "../community/model-cost-cell";
import { DataTable2 } from "../data-table/data-table-2";
import {
    DeleteRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../data-table/data-table-row-actions";
import { BuilderFilter } from "../filters/builder-filter";
import Money from "../money";

export default function ModelCostTableShell<T>({
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
                        <PrimaryCellContent>
                            {row.original.id}
                        </PrimaryCellContent>
                        <DateCellContent>
                            {row.original.createdAt}
                        </DateCellContent>
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
                        <PrimaryCellContent className="uppercase">
                            {row.original.modelName}
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.builder?.name}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },

            {
                id: "units",
                header: ColumnHeader("Total Units"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            {row.original._count?.homes || 0}
                        </PrimaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "cost",
                header: ColumnHeader("Model Cost"),
                cell: ({ row }) => (
                    <ModelCostCell
                        modal="modelCost"
                        row={row.original}
                        costs={row.original.costs}
                    />
                ),
            },
            {
                id: "install-costs",
                header: ColumnHeader("Install Costs"),
                cell: ({ row }) => (
                    <InstallCostCell
                        row={row.original as any}
                        modal="installCost"
                    />
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
                cell: ({ row }) => (
                    <RowActionCell>
                        <DeleteRowAction
                            action={deleteHomeTemplateAction}
                            row={row.original}
                        />
                        <RowActionMoreMenu>
                            <RowActionMenuItem
                                SubMenu={
                                    <>
                                        <RowActionMenuItem
                                            link={`/community/units?_q=${row.original.modelName}&_builderId=${row.original.builderId}`}
                                        >
                                            Units
                                        </RowActionMenuItem>
                                        <RowActionMenuItem
                                            link={`/community/invoices?_q=${row.original.modelName}&_builderId=${row.original.builderId}`}
                                        >
                                            Invoices
                                        </RowActionMenuItem>
                                    </>
                                }
                            >
                                View
                            </RowActionMenuItem>
                        </RowActionMoreMenu>
                    </RowActionCell>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending],
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
                    title: "",
                },
            ]}

            //  deleteRowsAction={() => void deleteSelectedRows()}
        />
    );
}
