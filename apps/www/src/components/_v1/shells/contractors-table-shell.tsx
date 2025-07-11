"use client";

import { useEffect, useMemo, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useRouter } from "next/navigation";
import { useEmployeeProfiles } from "@/_v2/hooks/use-static-data";
import {
    getStaticEmployeeProfiles,
    setEmployeeProfileAction,
} from "@/app/(v1)/_actions/hrm/employee-profiles";
import { _deleteEmployee } from "@/app/(v1)/_actions/hrm/employees.crud";
import { resetEmployeePassword } from "@/app/(v1)/_actions/hrm/save-employee";
import { openModal } from "@/lib/modal";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { IBuilder, IProject } from "@/types/community";
import { TableShellProps } from "@/types/data-table";
import { IUser } from "@/types/hrm";
import { ColumnDef } from "@tanstack/react-table";
import { Key } from "lucide-react";
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
} from "../columns/base-columns";
import { HomeProductionStatus } from "../columns/community-columns";
import { DataTable2 } from "../data-table/data-table-2";
import {
    DeleteRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../data-table/data-table-row-actions";
import { SmartTable } from "../data-table/smart-table";
import { BuilderFilter } from "../filters/builder-filter";
import { RolesFilter } from "../filters/roles-filter";
import { Icons } from "../icons";

export default function ContractorsTableShell({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IUser>) {
    const [isPending, startTransition] = useTransition();
    const profiles = useEmployeeProfiles();
    useEffect(() => {
        loadStaticList(
            "staticEmployeeProfiles",
            profiles,
            getStaticEmployeeProfiles,
        );
    }, []);
    const route = useRouter();
    async function setEmployeeProfile(employeeId, profile) {
        await setEmployeeProfileAction(employeeId, profile.id);
        toast.success("Profile set successfully.");
        route.refresh();
    }
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const table = SmartTable<IUser>(data);
    const columns = useMemo<ColumnDef<IUser, unknown>[]>(
        () => [
            table.checkColumn(),
            table.simpleColumn("#", (data) => ({
                story: [
                    table.primaryText(data.id),
                    table.secondary(data.createdAt),
                ],
            })),
            table.simpleColumn("Name", (data) => ({
                link: `/contractors/overview/${data.id}`,
                story: [
                    table.primaryText(data.name),
                    table.secondary(data.username),
                ],
            })),
            table.simpleColumn("Role", (data) => ({
                story: [table.secondary(data.role?.name)],
            })),
            table.simpleColumn("Profile", (data) => ({
                story: [
                    <DropdownMenu key={1}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                className="flex h-8  data-[state=open]:bg-muted"
                            >
                                <span className="whitespace-nowrap">
                                    {data.employeeProfile?.name ||
                                        "Select Profile"}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[185px]">
                            {profiles.data?.map((profile) => (
                                <DropdownMenuItem
                                    onClick={() =>
                                        setEmployeeProfile(data.id, profile)
                                    }
                                    key={profile.id}
                                >
                                    {profile.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>,
                ],
            })),
            ..._FilterColumn("_q", "_roleId"),
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
                            action={_deleteEmployee}
                        />
                        <RowActionMoreMenu>
                            <RowActionMenuItem
                                onClick={() => {
                                    openModal("employee", row.original);
                                }}
                                Icon={Icons.edit}
                            >
                                Edit
                            </RowActionMenuItem>
                            <RowActionMenuItem
                                onClick={async () => {
                                    await resetEmployeePassword(
                                        row.original?.id,
                                    );
                                    toast.success(
                                        "Password reset successfully!",
                                    );
                                }}
                                Icon={Key}
                            >
                                Reset Password
                            </RowActionMenuItem>
                            {/* <DeleteRowAction
                menu
                row={row.original}
                action={}
              /> */}
                        </RowActionMoreMenu>
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
            filterableColumns={[BuilderFilter, RolesFilter]}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "title, builder",
                },
            ]}

            //  deleteRowsAction={() => void deleteSelectedRows()}
        />
    );
}
