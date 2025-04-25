"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteCustomerService } from "@/app/(v1)/_actions/customer-services/crud";
import { staticEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import { openModal } from "@/lib/modal";
import { labelValue } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { IWorkOrder } from "@/types/customer-service";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "../../ui/badge";
import {
    _FilterColumn,
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
    StatusCell,
} from "../columns/base-columns";
import { DataTable2 } from "../data-table/data-table-2";
import {
    DeleteRowAction,
    EditRowAction,
    RowActionCell,
} from "../data-table/data-table-row-actions";
import { SmartTable } from "../data-table/smart-table";
import { TechEmployeeFilter } from "../filters/employee-filter";
import WorkOrderTechCell, {
    WorkOrderStatusCell,
} from "../work-order/tech-cell";

export default function CustomerServiceTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IWorkOrder>) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

    const techEmployees = useAppSelector((s) => s.slicers.staticTechEmployees);
    useEffect(() => {
        loadStaticList("staticTechEmployees", techEmployees, async () => {
            return await staticEmployees({
                role: "Punchout",
            });
        });
    }, []);

    const table = SmartTable<IWorkOrder>(data);
    const columns = useMemo<ColumnDef<IWorkOrder, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            table.simpleColumn("Appointment", (data) => ({
                story: [
                    table.primaryText(data.scheduleDate),
                    table.secondary(data.scheduleTime),
                ],
            })),
            table.simpleColumn("Customer", (data) => ({
                story: [
                    table.primaryText(data.homeOwner),
                    table.secondary(data.homePhone),
                ],
            })),
            table.simpleColumn("Description", (data) => ({
                link: `/customer-service/${data.slug}`,
                story: [
                    table.primaryText(data.projectName),
                    table.secondary(data.description),
                ],
            })),
            table.simpleColumn("Assigned To", (data) => ({
                story: [
                    <WorkOrderTechCell
                        key={1}
                        workOrder={data}
                    ></WorkOrderTechCell>,
                ],
            })),
            table.simpleColumn("Status", (data) => ({
                story: [<WorkOrderStatusCell workOrder={data} key={1} />],
            })),
            ..._FilterColumn("_q", "_show", "_userId"),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <EditRowAction
                            onClick={() =>
                                openModal("customerServices", row.original)
                            }
                        />
                        <DeleteRowAction
                            row={row.original}
                            action={async (id) => {
                                await deleteCustomerService(row.original.slug);
                            }}
                        />
                    </RowActionCell>
                ),
            },
        ],
        [data, isPending],
    );
    const columns1 = useMemo<ColumnDef<IWorkOrder, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                maxSize: 10,
                id: "id",
                header: ColumnHeader("Appointment"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            <DateCellContent>
                                {row.original.scheduleDate}
                            </DateCellContent>
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.scheduleTime}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "customer",
                header: ColumnHeader("Customer"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            {row.original.homeOwner}
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.homePhone}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "title",
                header: ColumnHeader("Description"),
                cell: ({ row }) => (
                    <Cell
                        link={`/customer-service/slug`}
                        slug={row.original.slug}
                    >
                        <PrimaryCellContent>
                            {row.original.projectName}{" "}
                            <Badge
                                className="rounded-sm bg-accent p-0.5
              px-1 leading-none  text-primary hover:bg-accent"
                            >
                                {row.original.lot || "-"}
                                {"/"}
                                {row.original.block ?? "-"}
                            </Badge>
                        </PrimaryCellContent>
                        <SecondaryCellContent className="line-clamp-2">
                            {row.original.description}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "tech",
                header: ColumnHeader("Tech"),
                cell: ({ row }) => (
                    <WorkOrderTechCell
                        workOrder={row.original}
                    ></WorkOrderTechCell>
                ),
            },
            {
                id: "status",
                header: ColumnHeader("Status"),
                cell: ({ row }) => (
                    <Cell>
                        <WorkOrderStatusCell workOrder={row.original} />
                    </Cell>
                ),
            },
            ..._FilterColumn("_q", "_show", "_userId"),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <EditRowAction
                            onClick={() =>
                                openModal("customerServices", row.original)
                            }
                        />
                        <DeleteRowAction
                            row={row.original}
                            action={async (id) => {
                                await deleteCustomerService(row.original.slug);
                            }}
                        />
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
            filterableColumns={[
                {
                    id: "_show",
                    title: "Show",
                    single: true,
                    options: [
                        labelValue("Scheduled", "scheduled"),
                        labelValue("Incomplete", "incomplete"),
                        labelValue("Completed", "completed"),
                    ],
                },
                TechEmployeeFilter,
            ]}
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
