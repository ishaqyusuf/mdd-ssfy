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
} from "../../../../../../components/_v1/columns/base-columns";

import { DataTable2 } from "../../../../../../components/_v1/data-table/data-table-2";

import { BuilderFilter } from "../../../../../../components/_v1/filters/builder-filter";

import { ICommunityTemplate } from "@/types/community";
import InstallCostCell from "../../../../../../components/_v1/community/install-cost-cell";
import { ProjectsFilter } from "../../../../../../components/_v1/filters/projects-filter";
import ModelCostCell, {
    CommunityModelCostCell,
} from "../../../../../../components/_v1/community/model-cost-cell";
import {
    DeleteRowAction,
    EditRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../../../../../../components/_v1/data-table/data-table-row-actions";
import {
    _deleteCommunitModel,
    _importModelCost,
} from "@/app/(v1)/_actions/community/community-template";
import { toast } from "sonner";
import { openModal } from "@/lib/modal";
import {
    _importModelCostData,
    _synchronizeModelCost,
} from "@/app/(v1)/_actions/community/community-model-cost";
import { timeout } from "@/lib/timeout";
import { ExternalLink, Import } from "lucide-react";

export default function CommunityTemplateTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<ICommunityTemplate>) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const columns = useMemo<ColumnDef<ICommunityTemplate, unknown>[]>(
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
                id: "project",
                header: ColumnHeader("Project"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            {row.original.project?.title}
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.project?.builder?.name}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "model",
                header: ColumnHeader("Model"),
                cell: ({ row }) => (
                    <Cell
                        link={"/settings/community/community-template/slug"}
                        slug={row.original.slug}
                    >
                        <PrimaryCellContent className="uppercase">
                            {row.original.modelName}
                        </PrimaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "unitCount",
                header: ColumnHeader("Units"),
                cell: ({ row }) => (
                    <>
                        <PrimaryCellContent>
                            {row.original._count.homes}
                        </PrimaryCellContent>
                    </>
                ), //<CommunityModelCostCell row={row.original} />
            },
            {
                id: "modelCost",
                header: ColumnHeader("Model Cost"),
                cell: ({ row }) => (
                    <ModelCostCell
                        modal="modelCost"
                        row={row.original}
                        // costs={row.original?.costs as any}
                        costs={row.original?.pivot?.modelCosts as any}
                    />
                ), //<CommunityModelCostCell row={row.original} />
            },
            {
                id: "install-costs",
                header: ColumnHeader("Install Cost"),
                cell: ({ row }) => (
                    <InstallCostCell row={row.original} modal="installCost" />
                ),
            },
            ..._FilterColumn("_q", "_builderId", "_projectId"),

            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <EditRowAction
                            onClick={(e) =>
                                openModal("communityTemplate", row.original)
                            }
                        />
                        <DeleteRowAction
                            noRefresh
                            row={row.original}
                            action={_deleteCommunitModel}
                            // action={async () => deleteOrderAction(row.id)}
                        />
                        <RowActionMoreMenu>
                            <RowActionMenuItem
                                _blank
                                link={`/community/units?_projectId=${row.original.projectId}&_q=${row.original.modelName}`}
                                Icon={ExternalLink}
                            >
                                View Units
                            </RowActionMenuItem>
                            <RowActionMenuItem
                                _blank
                                link={`/community/invoices?_projectId=${row.original.projectId}&_q=${row.original.modelName}`}
                                Icon={ExternalLink}
                            >
                                View Invoices
                            </RowActionMenuItem>
                            <RowActionMenuItem
                                Icon={Import}
                                onClick={async () => {
                                    async function __importCost() {
                                        return;
                                        async function updateCosts(index) {
                                            //
                                            const _cost = _?.costs[index];
                                            console.log(_cost);
                                            if (_cost)
                                                toast.promise(
                                                    async () => {
                                                        await _synchronizeModelCost(
                                                            _cost,
                                                            row.original.id
                                                        );
                                                        await timeout(1000);
                                                        return true;
                                                    },
                                                    {
                                                        error: `Cost Update Failed: ${_cost.title}`,
                                                        loading: `Updating Costs: ${_cost.title}`,
                                                        success: (data) => {
                                                            updateCosts(
                                                                index + 1
                                                            );
                                                            return `Updated`;
                                                        },
                                                    }
                                                );
                                        }
                                        console.log(
                                            row.original.project.builder.meta
                                                .tasks
                                        );
                                        const _ = await _importModelCostData(
                                            row.original.id,
                                            row.original.modelName,
                                            row.original.project.builderId,
                                            row.original.meta,
                                            row.original.project.builder.meta
                                                .tasks
                                        );
                                        if (!_) toast.error("No Import found");
                                        else {
                                            toast.success(
                                                "Cost Import Successfully"
                                            );
                                            await updateCosts(0);
                                        }
                                    }
                                    if (row.original.pivot?._count.modelCosts) {
                                        toast(
                                            "Model contains costs, this action will override existing costs. Proceed?",
                                            {
                                                action: {
                                                    label: "Yes",
                                                    onClick: async () =>
                                                        await __importCost(),
                                                },
                                            }
                                        );
                                    } else await __importCost();
                                }}
                            >
                                Import Model Cost
                            </RowActionMenuItem>

                            {/* <RowActionMenuItem>
                                Start Production
                            </RowActionMenuItem>
                            <RowActionMenuItem>
                                Submit Production
                            </RowActionMenuItem>
                            <RowActionMenuItem>
                                Cancel Production
                            </RowActionMenuItem> */}
                        </RowActionMoreMenu>
                    </RowActionCell>
                ),
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
            filterableColumns={[BuilderFilter, ProjectsFilter]}
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
