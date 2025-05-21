"use client";

import { ActionCell } from "../action-cell";
import { ColumnDef, ColumnMeta, PageItemData } from "@/types/type";
import { getEmployees } from "@/actions/get-employees";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";
import { useTable } from "..";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { updateEmployeeRole } from "@/actions/update-employee-role";
import { updateEmployeeProfile } from "@/actions/update-employee-profile";

export type Item = PageItemData<typeof getEmployees>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "#",
        accessorKey: "uid",
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Secondary className="font-bold">
                    {item.uid}
                </TCell.Secondary>
                <TCell.Secondary className="font-mono">
                    {item.date}
                </TCell.Secondary>
            </div>
        ),
    },
    {
        header: "Name",
        accessorKey: "name",

        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Primary className="">{item.name}</TCell.Primary>
                <TCell.Secondary className="font-mono">
                    {item.username}
                </TCell.Secondary>
            </div>
        ),
    },
    {
        header: "Role",
        accessorKey: "role",
        meta: {
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => <Role item={item} />,
    },
    {
        header: "Profile",
        accessorKey: "profile",
        meta: {
            preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => <Profile item={item} />,
    },
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return <ActionCell trash itemId={item.id}></ActionCell>;
        },
    },
];
function Profile({ item }: { item: Item }) {
    const ctx = useTable();
    const roles = ctx.tableMeta?.filterData?.find(
        (a) => a.value == "employeeProfileId",
    )?.options;
    const loader = useLoadingToast();
    async function updateRole(roleId) {
        loader.loading("Updating...");
        await updateEmployeeProfile(item.id, roleId);
        loader.success("Updated.");
    }
    return (
        <Menu
            label={item.profile?.name || "Select Profile"}
            Icon={null}
            variant={item?.profile?.id ? "secondary" : "destructive"}
            hoverVariant="default"
            triggerSize="xs"
        >
            {roles?.map((role) => (
                <Menu.Item
                    onClick={(e) => updateRole(Number(role.value))}
                    key={role.value}
                >
                    {role?.label}
                </Menu.Item>
            ))}
        </Menu>
    );
}
function Role({ item }: { item: Item }) {
    const ctx = useTable();
    const roles = ctx.tableMeta?.filterData?.find(
        (a) => a.value == "roleId",
    )?.options;
    const loader = useLoadingToast();
    async function updateRole(roleId) {
        loader.loading("Updating...");
        await updateEmployeeRole(item.id, roleId);
        loader.success("Updated.");
    }
    return (
        <Menu
            label={item.role?.name || "Role not set"}
            Icon={null}
            variant={item?.role?.id ? "secondary" : "destructive"}
            hoverVariant="default"
            triggerSize="xs"
        >
            {roles?.map((role) => (
                <Menu.Item
                    onClick={(e) => updateRole(Number(role.value))}
                    key={role.value}
                >
                    {role?.label}
                </Menu.Item>
            ))}
        </Menu>
    );
    return <div>{item.role?.name}</div>;
}
