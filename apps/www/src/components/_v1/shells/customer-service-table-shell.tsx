"use client";

import { useEffect, useMemo, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { deleteCustomerService } from "@/app/(v1)/_actions/customer-services/crud";
import { staticEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import { labelValue } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { IWorkOrder } from "@/types/customer-service";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@gnd/ui/badge";
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
import { useWorkOrderParams } from "@/hooks/use-work-order-params";

export default function CustomerServiceTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IWorkOrder>) {
    const [isPending, startTransition] = useTransition();

    const { setParams } = useWorkOrderParams();
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
                                setParams({
                                    editWorkOrderId: row.original.id,
                                })
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
