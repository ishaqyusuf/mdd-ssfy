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
    _FilterColumn,
} from "../columns/base-columns";

import { DataTable2 } from "../data-table/data-table-2";

import { ExtendedHome, IHome } from "@/types/community";
import { BuilderFilter } from "../filters/builder-filter";
import { HomeInvoiceColumn, HomeStatus } from "../columns/community-columns";
import { HomesBatchAction } from "../community/homes-selection-action";
import { EditRowAction } from "../data-table/data-table-row-actions";
import { ProjectsFilter } from "../filters/projects-filter";
import { labelValue } from "@/lib/utils";
import { openModal } from "@/lib/modal";

export default function CommunityInvoiceTableShell<T>({
    data,
    pageInfo,
    searchParams,
    projectView,
}: TableShellProps<ExtendedHome> & {
    projectView: Boolean;
}) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const columns = useMemo<ColumnDef<ExtendedHome, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                maxSize: 10,
                id: "id",
                header: ColumnHeader("ID"),
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
            ...(!projectView
                ? ([
                      {
                          header: ColumnHeader("Project"),
                          id: "title",
                          cell: ({ row }) => (
                              <Cell
                                  link="/community/project/slug"
                                  slug={row.original.project?.slug}
                              >
                                  <PrimaryCellContent>
                                      {row.original?.project?.title}
                                  </PrimaryCellContent>

                                  <SecondaryCellContent>
                                      {row.original?.project?.builder?.name}
                                  </SecondaryCellContent>
                              </Cell>
                          ),
                      },
                  ] as ColumnDef<ExtendedHome, unknown>[])
                : []),
            {
                accessorKey: "lotBlock",
                header: ColumnHeader("Unit"),
                cell: ({ row }) => (
                    <Cell
                        link={"/settings/community/model-template/slug"}
                        slug={row.original?.slug}
                    >
                        <PrimaryCellContent>
                            {row.original.lot}
                            {"/"}
                            {row.original.block}
                        </PrimaryCellContent>
                        <SecondaryCellContent className="uppercase">
                            {row.original?.modelName}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            // {
            //   accessorKey: "model",
            //   cell: ({ row }) => (
            //     <Cell>
            //       <SecondaryCellContent>
            //         {row.original?.modelName}
            //       </SecondaryCellContent>
            //     </Cell>
            //   ),
            //   header: ColumnHeader("Model No"),
            // },
            // {
            //   accessorKey: "lot",
            //   header: ColumnHeader("Lot/Block"),
            //   cell: ({ row }) => (
            //     <Cell>
            //       <PrimaryCellContent>
            //         {row.original.lot}
            //         {"/"}
            //         {row.original.block}
            //       </PrimaryCellContent>
            //     </Cell>
            //   ),
            // },

            {
                accessorKey: "status",
                header: ColumnHeader("Status"),
                cell: ({ row }) => (
                    <Cell>
                        <HomeStatus home={row.original} />
                    </Cell>
                ),
            },
            {
                accessorKey: "invoice",
                header: ColumnHeader("Invoice"),
                cell: ({ row }) => <HomeInvoiceColumn home={row.original} />,
            },
            ..._FilterColumn(
                "_status",
                "_q",
                "_builderId",
                "_date",
                "_projectId",
                "_dateType",
                "_production",
                "_showInvoiceType"
                // "_installation",
            ),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="">
                        <EditRowAction
                            onClick={(e) => {
                                openModal("editInvoice", row.original);
                            }}
                        />
                    </div>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending]
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
                    BuilderFilter,
                    ProjectsFilter,
                    {
                        id: "_showInvoiceType",
                        title: "Task",
                        single: true,
                        options: [
                            labelValue("Has Payment", "has payment"),
                            // labelValue("Full Paid", "full paid"),
                            labelValue("Has no payment", "no payment"),
                        ],
                    },
                    {
                        id: "_production",
                        title: "Production",
                        single: true,
                        options: [
                            // labelValue("Completed", "completed"),
                            // labelValue("Not In Production", "idle"),
                            // labelValue("Started", "started"),
                            // labelValue("Queued", "queued"),
                            labelValue("by recently queued", "sort"),
                            // labelValue("Recently sent", "queued"),
                        ],
                    },
                    {
                        id: "_installation",
                        title: "Installation",
                        single: true,
                        options: [
                            labelValue("Submitted", "submitted"),
                            labelValue("No Submission", "no-submission"),
                        ],
                    },
                ]}
                searchableColumns={[
                    {
                        id: "_q" as any,
                        title: projectView
                            ? "project Name,model,lot/block"
                            : "model, lot/block",
                    },
                ]}
                dateFilterColumns={[
                    {
                        id: "_date" as any,
                        title: "Due Date",
                        // rangeSwitch: true,
                        filter: {
                            single: true,
                            title: "Filter By",
                            id: "_dateType" as any,
                            defaultValue: "Due Date",
                            options: [
                                {
                                    label: "Due Date",
                                    value: "productionDueDate",
                                },
                                { label: "Unit Date", value: "createdAt" },
                                {
                                    label: "Sent to Prod at",
                                    value: "sentToProductionAt",
                                },
                            ],
                        },
                    },
                ]}
                //  deleteRowsAction={() => void deleteSelectedRows()}
            />
        </>
    );
}
