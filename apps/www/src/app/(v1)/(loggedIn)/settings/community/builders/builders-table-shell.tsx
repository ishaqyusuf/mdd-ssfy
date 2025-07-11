"use client";

import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import {
    CheckColumn,
    ColumnHeader,
    Cell,
    PrimaryCellContent,
    DateCellContent,
    SecondaryCellContent,
} from "../../../../../../components/_v1/columns/base-columns";

import { DataTable2 } from "../../../../../../components/_v1/data-table/data-table-2";

import { BuilderFilter } from "../../../../../../components/_v1/filters/builder-filter";
import { IBuilder, IProject } from "@/types/community";
import {
    DeleteRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../../../../../../components/_v1/data-table/data-table-row-actions";
import { deleteBuilderAction } from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import { Icons } from "../../../../../../components/_v1/icons";
import { openModal } from "@/lib/modal";
import PageHeader from "@/components/_v1/page-header";
import { useBuilderModal } from "./builder-modal";

export default function BuildersTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IBuilder>) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

    const columns = useMemo<ColumnDef<IBuilder, unknown>[]>(
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
                header: ColumnHeader("Builder"),
                cell: ({ row }) => (
                    <Cell>
                        {/* link={`/community/project/slug`} slug={row.original.slug} */}
                        <PrimaryCellContent>
                            {row.original.name}
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original?.meta?.address}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },

            {
                id: "projects",
                header: ColumnHeader("Total Projects"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            {row.original._count?.projects}
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
                cell: ({ row }) => (
                    <RowActionCell>
                        <DeleteRowAction
                            row={row.original}
                            action={deleteBuilderAction}
                        />
                        <RowActionMoreMenu>
                            <RowActionMenuItem
                                SubMenu={
                                    <>
                                        <RowActionMenuItem
                                            onClick={() => {
                                                modal.edit(row.original);
                                            }}
                                            Icon={Icons.edit}
                                        >
                                            Info
                                        </RowActionMenuItem>
                                        <RowActionMenuItem
                                            onClick={() => {
                                                modal.editTasks(row.original);
                                            }}
                                            Icon={Icons.edit}
                                        >
                                            Tasks
                                        </RowActionMenuItem>
                                    </>
                                }
                                Icon={Icons.edit}
                            >
                                Edit
                            </RowActionMenuItem>
                            <DeleteRowAction
                                menu
                                row={row.original}
                                action={deleteBuilderAction}
                            />
                        </RowActionMoreMenu>
                    </RowActionCell>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending],
    );
    const modal = useBuilderModal();
    function createBuilder() {
        modal.create();
    }
    return (
        <>
            <PageHeader title="Builders" newAction={createBuilder} />
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
        </>
    );
}
