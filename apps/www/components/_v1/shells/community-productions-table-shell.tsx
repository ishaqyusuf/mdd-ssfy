"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { deleteHome } from "@/app/(v1)/_actions/community/home";
import { openModal } from "@/lib/modal";
import { sum } from "@/lib/utils";
import { dispatchSlice } from "@/store/slicers";
import {
    ExtendedHomeTasks,
    IHome,
    IHomeTask,
    IInvoice,
    IProject,
} from "@/types/community";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Printer, View } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import {
    OrderRowAction,
    PrintOrderMenuAction,
    ProductionAction,
} from "../actions/sales-menu-actions";
import UnitTaskProductionAction from "../actions/unit-task-production-actions";
import {
    _FilterColumn,
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import {
    HomeInstallationStatus,
    HomeProductionStatus,
} from "../columns/community-columns";
import { HomesBatchAction } from "../community/homes-selection-action";
import { DataTable2 } from "../data-table/data-table-2";
import { RowActionCell } from "../data-table/data-table-row-actions";
import { SmartTable } from "../data-table/smart-table";
import { BuilderFilter } from "../filters/builder-filter";
import { ProjectsFilter } from "../filters/projects-filter";
import { TaskFilters } from "../filters/task-filters";
import { Icons } from "../icons";
import Money from "../money";
import StatusBadge from "../status-badge";

export default function CommunityProductionsTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<ExtendedHomeTasks>) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const table = SmartTable<ExtendedHomeTasks>(
        data.map((task) => {
            task.__taskSubtitle = `${task.project.title} ${task.home.modelName} ${task.home.lot}/${task.home.block}`;
            return task;
        }),
    );
    const columns = useMemo<ColumnDef<ExtendedHomeTasks, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            table.simpleColumn("#", (data) => ({
                story: [
                    table.primaryText(data.id),
                    table.secondary(data.createdAt),
                ],
            })),
            table.simpleColumn("Job", (data) => ({
                story: [
                    table.primaryText(data.__taskSubtitle),
                    table.secondary(data.taskName),
                ],
            })),
            table.simpleColumn("Due Date", (data) => ({
                story: [table.primaryText(data.productionDueDate)],
            })),
            table.simpleColumn("Status", (data) => ({
                story: [
                    table.status(
                        data?.home?._count?.jobs
                            ? "Completed"
                            : data.productionStatus || "unknown",
                    ),
                ],
            })),
            ..._FilterColumn(
                "_status",
                "_q",
                "_task",
                "_projectId",
                "_builderId",
            ),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <UnitTaskProductionAction task={row.original} />
                        {/* <RowActionMoreMenu>
                        </RowActionMoreMenu> */}
                    </RowActionCell>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending],
    );
    return (
        <>
            <DataTable2
                searchParams={searchParams}
                columns={columns}
                pageInfo={pageInfo}
                data={data}
                BatchAction={HomesBatchAction}
                filterableColumns={[
                    ProjectsFilter,
                    (props) => (
                        <TaskFilters
                            {...props}
                            listKey="productionTasks"
                            query={{ produceable: true }}
                        />
                    ),
                ]}
                searchableColumns={[
                    {
                        id: "_q" as any,
                        title: "search invoice",
                    },
                ]}
                dateFilterColumns={[
                    {
                        id: "_date" as any,
                        title: "Date",
                    },
                ]}
                //  deleteRowsAction={() => void deleteSelectedRows()}
            />
        </>
    );
}
