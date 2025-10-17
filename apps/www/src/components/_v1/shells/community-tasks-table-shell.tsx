"use client";

import { useMemo, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { openModal } from "@/lib/modal";
import { ExtendedHomeTasks } from "@/types/community";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@gnd/ui/button";

import { _FilterColumn, ColumnHeader } from "../columns/base-columns";
import { HomesBatchAction } from "../community/homes-selection-action";
import { DataTable2 } from "../data-table/data-table-2";
import { RowActionCell } from "../data-table/data-table-row-actions";
import { SmartTable } from "../data-table/smart-table";
import { BuilderFilter } from "../filters/builder-filter";
import { ProjectsFilter } from "../filters/projects-filter";
import { TaskFilters } from "../filters/task-filters";

export default function CommunityTaskTableShell({
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
            // CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            table.simpleColumn("#", (data) => ({
                story: [
                    table.primaryText(data.id),
                    table.secondary(data.createdAt),
                ],
            })),
            table.simpleColumn("Job", (data) => ({
                story: [
                    table.secondary(data.__taskSubtitle),
                    table.primaryText(data.taskName),
                ],
            })),
            table.simpleColumn("Assigned To", (data) => ({
                story: [
                    <Button
                        disabled={
                            (data?.job?.status &&
                                data?.job?.status?.toLowerCase() !=
                                    "assigned") as boolean
                        }
                        onClick={() => {
                            openModal("assignTask", data);
                        }}
                        key={1}
                        size="sm"
                        className="h-7 p-1 px-2"
                        variant={data?.assignedToId ? "secondary" : "outline"}
                    >
                        {data?.assignedTo?.name || "Not Assigned"}
                    </Button>,
                ],
            })),
            table.simpleColumn("Status", (data) => ({
                story: [table.status(data?.job?.status || "Pending")],
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
                        {/* <UnitTaskProductionAction task={row.original} /> */}
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
                    BuilderFilter,
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
                        title: "",
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
