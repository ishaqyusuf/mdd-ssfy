"use client";

import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState, useTransition } from "react";
import {
    CheckColumn,
    ColumnHeader,
    _FilterColumn,
} from "../../../../../../components/_v1/columns/base-columns";

import { DataTable2 } from "../../../../../../components/_v1/data-table/data-table-2";

import { BuilderFilter } from "../../../../../../components/_v1/filters/builder-filter";
import { IProject } from "@/types/community";

import AddonCell from "../../../../../../components/_v1/community/addon-cell";
import { SmartTable } from "../../../../../../components/_v1/data-table/smart-table";
import InstallCostCell from "../../../../../../components/_v1/community/install-cost-cell";
import {
    DeleteRowAction,
    EditRowAction,
    RowActionCell,
} from "../../../../../../components/_v1/data-table/data-table-row-actions";
import { deleteProjectAction } from "../actions/delete-project-action";
import { useModal } from "@/components/common/modal/provider";

import PageHeader from "@/components/_v1/page-header";
import ProjectModal from "../project-modal";
export default function ProjectsTableShell<T>({
    data,
    pageInfo,
    searchParams,
    cost,
}: TableShellProps<IProject> & { cost?: Boolean }) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const table = SmartTable<IProject>(data);
    // table.checkColumn();

    const modal = useModal();
    const columns = useMemo<ColumnDef<IProject, unknown>[]>(
        () => [
            CheckColumn({
                selectedRowIds,
                setSelectedRowIds,
                data,
            }),
            table.simpleColumn("Ref/Date", (data) => ({
                story: [
                    table.primaryText(data.refNo),
                    table.secondary(data.createdAt),
                ],
            })),
            table.simpleColumn("Project", (data) => ({
                link: `/community/project/${data.slug}`,
                story: [
                    table.primaryText(data.title),
                    table.secondary(data.builder?.name),
                ],
            })),
            ...table.orColumns(
                cost,
                [
                    // table.simpleColumn("Model Cost", data => ({
                    //     story: [
                    //         <ModelCostCell
                    //             key={1}
                    //             modal="communityModelCost"
                    //             row={data}
                    //             costs={[data.meta.modelCost].filter(Boolean)}
                    //         />
                    //     ]
                    // })),
                    table.simpleColumn("Install Cost", (data) => ({
                        story: [
                            <InstallCostCell
                                key={1}
                                modal="communityInstallCost"
                                row={data as any}
                            />,
                        ],
                    })),
                ],
                [
                    table.simpleColumn("Supervisor", (data) => ({
                        story: [
                            table.primaryText(data.meta?.supervisor?.name),
                            table.secondary(data.meta?.supervisor?.email),
                        ],
                    })),
                    table.simpleColumn("Units", (data) => ({
                        story: [table.primaryText(data._count?.homes)],
                    })),
                    table.simpleColumn("Addons", (data) => ({
                        story: [<AddonCell key={1} project={data} />],
                    })),
                ]
            ),
            ..._FilterColumn("_q", "_builderId", "_status"),

            {
                id: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <EditRowAction
                            onClick={() => {
                                modal.openModal(
                                    <ProjectModal data={row.original} />
                                );
                            }}
                        />
                        <DeleteRowAction
                            row={row.original}
                            action={deleteProjectAction}
                        />
                    </RowActionCell>
                ),
                // cell: ({ row }) => <OrderRowAction row={row.original} />,
            },
        ], //.filter(Boolean) as any,
        [data, isPending]
    );
    return (
        <>
            <PageHeader
                title="Projects"
                newAction={() => {
                    modal.openModal(<ProjectModal />);
                }}
            />
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
        </>
    );
}
