"use client";

import { useMemo, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deactivateProduction } from "@/app/(v1)/_actions/community/activate-production";
import { getUnitTemplateLink } from "@/app/(v1)/_actions/community/get-unit-template";
import { deleteHome } from "@/app/(v1)/_actions/community/home";
import { deepCopy } from "@/lib/deep-copy";
import { openModal } from "@/lib/modal";
import { labelValue } from "@/lib/utils";
import { dispatchSlice } from "@/store/slicers";
import { ExtendedHome } from "@/types/community";
import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Printer, View } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import {
    _FilterColumn,
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../../../../../components/_v1/columns/base-columns";
import {
    HomeInstallationStatus,
    HomeProductionStatus,
} from "../../../../../components/_v1/columns/community-columns";
import { HomeBatchAction } from "../../../../../components/_v1/community/home-selection-action";
import { HomesBatchAction } from "../../../../../components/_v1/community/homes-selection-action";
import { DataTable2 } from "../../../../../components/_v1/data-table/data-table-2";
import {
    DeleteRowAction,
    Menu,
    MenuItem,
    RowActionCell,
    RowActionMoreMenu,
} from "../../../../../components/_v1/data-table/data-table-row-actions";
import { ProjectsFilter } from "../../../../../components/_v1/filters/projects-filter";
import { Icons } from "../../../../../components/_v1/icons";
import HomePrinter from "../../../../../components/_v1/print/home/home-printer";
import { useHomeModal } from "./home-modal";

export default function HomesTableShell<T>({
    data,
    pageInfo,
    searchParams,
    projectView,
}: TableShellProps<ExtendedHome> & {
    projectView: Boolean;
}) {
    const [isPending, startTransition] = useTransition();
    const route = useRouter();
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const modal = useHomeModal();
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
                        className={"cursor-pointer hover:underline"}
                        onClick={async (e) => {
                            const edit = await getUnitTemplateLink(
                                row.original.projectId,
                                row.original.homeTemplateId,
                                row.original.modelName,
                            );
                            if (edit) route.push(edit);
                        }}
                        // xlink="/community/unit/slug"
                        slug={row.original?.slug}
                    >
                        <PrimaryCellContent>
                            {/* {row.original.lot}
                            {"/"}
                            {row.original.block} */}
                            {row.original.lotBlock}
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
                accessorKey: "prod",
                header: ColumnHeader("Production"),
                cell: ({ row }) => (
                    <Cell>
                        <HomeProductionStatus home={row.original} />
                    </Cell>
                ),
            },
            {
                accessorKey: "inst",
                header: ColumnHeader("Installation"),
                cell: ({ row }) => (
                    <Cell
                        slug="jobs"
                        link={
                            row.original.jobs?.length > 0
                                ? `/contractor/slug?_homeId=${row.original.id}&page=1`
                                : null
                        }
                    >
                        <HomeInstallationStatus home={row.original} />
                    </Cell>
                ),
            },
            ..._FilterColumn(
                "_status",
                "_q",
                "_builderId",
                "_projectId",
                // "_installation",
                // "_production"
            ),

            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[185px]">
                            {/* <Link
                href={`/community/unit-model/${row.original.homeTemplateId}`}
              > */}

                            <DropdownMenuItem
                                onClick={async (e) => {
                                    const edit = await getUnitTemplateLink(
                                        row.original.projectId,
                                        row.original.homeTemplateId,
                                        row.original.modelName,
                                    );
                                    if (edit) route.push(edit);
                                    else
                                        toast.error("Model Template Not Found");
                                }}
                            >
                                <Icons.edit className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                                Edit Template
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    // openModal("home", row.original);
                                    console.log(row.original);

                                    modal.open(row.original);
                                }}
                            >
                                <Icons.edit className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                                Edit Model
                            </DropdownMenuItem>
                            {!row.original?.tasks.some(
                                (t) => t.sentToProductionAt,
                            ) ? (
                                <MenuItem
                                    onClick={() => {
                                        openModal("activateProduction", [
                                            row.original,
                                        ]);
                                    }}
                                    Icon={Icons.production}
                                >
                                    Send to Production
                                </MenuItem>
                            ) : (
                                <MenuItem
                                    onClick={async () => {
                                        await deactivateProduction([
                                            row.original.id,
                                        ]);
                                        toast.success("Removed");
                                    }}
                                    Icon={Icons.production}
                                >
                                    Remove from Production
                                </MenuItem>
                            )}
                            {/* </Link> */}
                            <DropdownMenuItem
                                onClick={() => {
                                    dispatchSlice("printHomes", {
                                        homes: [deepCopy(row.original)],
                                    });
                                }}
                            >
                                <Printer className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                                Print
                            </DropdownMenuItem>
                            <DeleteRowAction
                                menu
                                row={row.original}
                                action={deleteHome}
                                // action={async () => deleteOrderAction(row.id)}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending],
    );

    return (
        <>
            <HomePrinter />
            <DataTable2
                searchParams={searchParams}
                columns={columns}
                pageInfo={pageInfo}
                data={data}
                BatchAction={HomeBatchAction}
                filterableColumns={[
                    ProjectsFilter,
                    {
                        id: "_production",
                        title: "Production",
                        single: true,
                        options: [
                            labelValue("Completed", "completed"),
                            labelValue("Not In Production", "idle"),
                            labelValue("Started", "started"),
                            labelValue("Queued", "queued"),
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

                //  deleteRowsAction={() => void deleteSelectedRows()}
            />
        </>
    );
}
