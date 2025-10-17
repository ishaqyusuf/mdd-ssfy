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
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useEmployeesParams } from "@/hooks/use-employee-params";
import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@gnd/ui/tanstack";
import { triggerTask } from "@/actions/trigger-task";

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
                <TCell.Secondary className="font-mono$">
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
                <TCell.Secondary className="font-mono$">
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
            return <Action item={item} />;
        },
    },
];
function Action({ item }: { item: Item }) {
    const { params, setParams } = useEmployeesParams();
    const trpc = useTRPC();
    const toast = useLoadingToast();
    const submitAction = useMutation(
        trpc.hrm.resetEmployeePassword.mutationOptions({
            async onSuccess(data, variables, context) {
                // if(isDev)
                // await triggerTask({
                //     taskName: "send-password-reset-to-default-email",
                //     payload: {},
                // });
                toast.success("Password Reset Successfully");
            },
            onError(error, variables, context) {
                toast.error("Unable to complete");
            },
        }),
    );
    function onSubmit() {
        submitAction.mutate({
            userId: item.id,
        });
        toast.loading("Resetting password");
    }
    return (
        <ActionCell
            // Menu={
            //     <>
            //         <Menu.Item onClick={(e) => onSubmit()} icon="packingList">
            //             Reset Password
            //         </Menu.Item>
            //     </>
            // }
            trash
            itemId={item.id}
        >
            <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                    setParams({
                        editEmployeeId: item.id,
                    });
                }}
            >
                <Icons.Edit className="h-4 w-4" />
            </Button>
            <Menu>
                <Menu.Item
                    onClick={(e) => {
                        onSubmit();
                    }}
                    icon="packingList"
                >
                    Reset Password
                </Menu.Item>
            </Menu>
        </ActionCell>
    );
}
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
        <AuthGuard
            rules={[_perm.is("editRole")]}
            Fallback={
                <Badge variant="secondary">
                    {item.profile?.name || "not set"}
                </Badge>
            }
        >
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
        </AuthGuard>
    );
}
function Role({ item }: { item: Item }) {
    const ctx = useTable();
    const roles = ctx.tableMeta?.filterData?.find(
        (a) => a.value == "roleId",
    )?.options;
    const loader = useLoadingToast();
    // const session = useAsyncMemo
    async function updateRole(roleId) {
        loader.loading("Updating...");
        await updateEmployeeRole(item.id, roleId);
        loader.success("Updated.");
    }
    return (
        <AuthGuard
            rules={[_perm.is("editRole")]}
            Fallback={<Badge variant="secondary">{item.role?.name}</Badge>}
        >
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
        </AuthGuard>
    );
}
