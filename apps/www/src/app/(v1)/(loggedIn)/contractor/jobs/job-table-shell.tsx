"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteJobAction } from "@/app/(v1)/_actions/hrm-jobs/delete-job";
import {
    approveJob,
    rejectJob,
} from "@/app/(v1)/_actions/hrm-jobs/job-actions";
import SubmitJobModal from "@/app/(v2)/(loggedIn)/contractors/_modals/submit-job-modal";
import { useModal } from "@/components/common/modal/provider";
import { openModal } from "@/lib/modal";
import { labelValue, truthy } from "@/lib/utils";
import { TableShellProps } from "@/types/data-table";
import { IJobs } from "@/types/hrm";
import { ColumnDef } from "@tanstack/react-table";
import { Briefcase, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import {
    _FilterColumn,
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../../../../../components/_v1/columns/base-columns";
import { DataTable2 } from "../../../../../components/_v1/data-table/data-table-2";
import {
    DeleteRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../../../../../components/_v1/data-table/data-table-row-actions";
import { PayableEmployees } from "../../../../../components/_v1/filters/employee-filter";
import { ProjectsFilter } from "../../../../../components/_v1/filters/projects-filter";
import JobType from "../../../../../components/_v1/hrm/job-type";
import { Icons } from "../../../../../components/_v1/icons";
import Money from "../../../../../components/_v1/money";
import JobOverviewSheet from "./job-overview/job-overview-sheet";

export default function JobTableShell<T>({
    data,
    pageInfo,
    searchParams,
    payment,
    adminMode,
}: TableShellProps<IJobs> & {
    payment?: boolean;
    adminMode?: boolean;
}) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const modal = useModal();
    const columns = useMemo<ColumnDef<IJobs, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                id: "job",
                header: ColumnHeader("Job"),
                cell: ({ row }) => (
                    <Cell
                        className="cursor-pointer"
                        onClick={() => {
                            modal.openSheet(
                                <JobOverviewSheet
                                    job={row.original}
                                    admin={payment}
                                />,
                            );
                        }}
                    >
                        <PrimaryCellContent>
                            {row.original.title || "-"}{" "}
                            <JobType job={row.original} />
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.subtitle ||
                                row.original.description ||
                                row.original.note ||
                                ""}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            ...(!payment && adminMode
                ? [
                      {
                          id: "user",
                          header: ColumnHeader("Done By"),
                          cell: ({ row }) => (
                              <Cell>
                                  <SecondaryCellContent>
                                      {row.original.user?.name}{" "}
                                      {row.original.coWorkerId && (
                                          <>
                                              <Badge className="bg-accent leading-none text-accent-foreground hover:bg-accent">
                                                  joint task
                                              </Badge>
                                          </>
                                      )}
                                  </SecondaryCellContent>
                              </Cell>
                          ),
                      },
                      {
                          id: "charges",
                          header: ColumnHeader("Extra Charges"),
                          cell: ({ row }) => (
                              <Cell>
                                  <SecondaryCellContent>
                                      <Money
                                          value={
                                              row.original?.meta.additional_cost
                                          }
                                      />
                                  </SecondaryCellContent>
                              </Cell>
                          ),
                      },
                  ]
                : []),
            {
                id: "total",
                header: ColumnHeader("Total"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent>
                            <Money value={row.original?.amount} />
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "status",
                header: ColumnHeader("Status"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent>
                            {row.original.status}
                        </SecondaryCellContent>
                        <DateCellContent>
                            {row.original.statusDate}
                        </DateCellContent>
                    </Cell>
                ),
            },
            ...truthy<any>(
                payment,
                [],
                [
                    {
                        id: "actions",
                        header: ColumnHeader(""),
                        size: 15,
                        maxSize: 15,
                        enableSorting: false,
                        cell: ({ row }) => (
                            <RowActionCell>
                                {row.original.status?.toLowerCase() ==
                                    "assigned" && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                openModal("submitJob", {
                                                    data: row.original,
                                                });
                                            }}
                                            className="h-8 bg-green-600"
                                        >
                                            Submit
                                        </Button>
                                    </>
                                )}
                                <DeleteRowAction
                                    row={row.original}
                                    action={async () =>
                                        await deleteJobAction({
                                            id: row.original.id,
                                            taskId: row.original.taskId,
                                        })
                                    }
                                    disabled={
                                        row.original.paymentId > 0 ||
                                        row.original.homeTasks?.length
                                    }
                                />
                                <RowActionMoreMenu>
                                    <RowActionMenuItem
                                        disabled={row.original.paymentId}
                                        onClick={() => {
                                            modal.openModal(
                                                <SubmitJobModal
                                                    job={row.original}
                                                />,
                                            );
                                        }}
                                        Icon={Icons.edit}
                                    >
                                        Edit
                                    </RowActionMenuItem>
                                    <RowActionMenuItem
                                        disabled={row.original.paymentId}
                                        onClick={() => {
                                            openModal("submitJob", {
                                                data: row.original,
                                                defaultTab: "user",
                                                changeWorker: true,
                                            });
                                        }}
                                        Icon={Briefcase}
                                    >
                                        Change Worker
                                    </RowActionMenuItem>

                                    <RowActionMenuItem
                                        disabled={row.original.paymentId}
                                        onClick={async () => {
                                            await approveJob(row.original?.id);
                                            toast.success("Job Approved");
                                        }}
                                        Icon={CheckCheck}
                                    >
                                        Approve Job
                                    </RowActionMenuItem>

                                    <RowActionMenuItem
                                        disabled={row.original.paymentId}
                                        onClick={async () => {
                                            await rejectJob(row.original?.id);
                                            toast.success("Job Rejected");
                                        }}
                                        Icon={X}
                                    >
                                        Reject Job
                                    </RowActionMenuItem>

                                    <DeleteRowAction
                                        menu
                                        disabled={
                                            row.original.paymentId > 0 ||
                                            row.original.homeTasks?.length
                                        }
                                        row={row.original}
                                        action={deleteJobAction}
                                    />
                                </RowActionMoreMenu>
                            </RowActionCell>
                        ),
                    },
                ],
            ),
            ..._FilterColumn(
                "_projectId",
                "_q",
                "_userId",
                "_show",
                "_builderId",
                "_date",
            ),
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
                        labelValue("Approved", "approved"),
                        labelValue("Pending Approved", "submitted"),
                        labelValue("Paid", "paid"),
                        labelValue("Pending Payment", "unpaid"),
                    ],
                },
                adminMode && ProjectsFilter,
                adminMode && PayableEmployees,
            ].filter(Boolean)}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "job, description",
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
    );
}
