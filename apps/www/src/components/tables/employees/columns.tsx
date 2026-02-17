"use client";

import { ActionCell } from "../action-cell";
import { ColumnDef, ColumnMeta, PageItemData } from "@/types/type";
import { getEmployees } from "@/actions/get-employees";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";

import { useLoadingToast } from "@/hooks/use-loading-toast";
import { updateEmployeeRole } from "@/actions/update-employee-role";
import { updateEmployeeProfile } from "@/actions/update-employee-profile";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { triggerTask } from "@/actions/trigger-task";
import { Item } from "@gnd/ui/composite";
import { _qc, _trpc } from "@/components/static-trpc";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useTable } from "@gnd/ui/data-table";
import { useProfilesList, useRolesList } from "@/hooks/use-data-list";
import { useState } from "react";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { EditButton } from "@/components/edit-button";

export type Item = RouterOutputs["hrm"]["getEmployees"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
export const columns: Column[] = [
    {
        header: "#",
        accessorKey: "uid",
        cell: ({ row: { original: item } }) => (
            <div>
                <Item.Description className="font-bold">
                    {item.uid}
                </Item.Description>
                <Item.Description className="font-mono$">
                    {item.date}
                </Item.Description>
            </div>
        ),
    },
    {
        header: "Name",
        accessorKey: "name",

        cell: ({ row: { original: item } }) => (
            <div>
                <Item.Title className="">{item.name}</Item.Title>
                <Item.Description className="font-mono$">
                    {item.username}
                </Item.Description>
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
        header: "Office",
        accessorKey: "Office",
        meta: {
            // preventDefault: true,
            className: "",
        },
        cell: ({ row: { original: item } }) => <Office item={item} />,
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
function Office({ item }: { item: Item }) {
    const { data } = useQuery(_trpc.orgs.getOrganizationProfile.queryOptions());
    return (
        <Menu
            Icon={null}
            variant="secondary"
            label={item?.org?.name || "Not Set"}
        >
            {data?.orgs?.map((org) => (
                <Menu.Item key={org.id}>{org.name}</Menu.Item>
            ))}
        </Menu>
    );
}
function Action({ item }: { item: Item }) {
    const { params, setParams } = useEmployeeParams();
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
        <div className="relative flex items-center gap-2 z-10">
            <EditButton
                onClick={(e) => {
                    setParams({
                        editEmployeeId: item.id,
                    });
                }}
            />
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
        </div>
    );
}
function Profile({ item }: { item: Item }) {
    const ctx = useTable();
    // const roles = ctx.tableMeta?.filterData?.find(
    //     (a) => a.value == "employeeProfileId",
    // )?.options;
    const [open, setOpen] = useState(false);
    const profiles = useProfilesList(open);
    const { mutate: updateProfile, isPending } = useMutation(
        useTRPC().hrm.updateEmployeeProfile.mutationOptions({
            onSuccess(data, variables, context) {
                invalidateInfiniteQueries("hrm.getEmployees");
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    // const loader = useLoadingToast();
    // async function updateProfile(profileId) {
    //     loader.loading("Updating...");
    //     await updateEmployeeProfile(item.id, profileId);
    //     // ctx?.table?.reset();
    //     loader.success("Updated.");
    // }
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
                <Menu.Item
                    onClick={(e) =>
                        updateProfile({
                            userId: item.id,
                        })
                    }
                >
                    Non
                </Menu.Item>
                {profiles?.map((profile) => (
                    <Menu.Item
                        onClick={(e) =>
                            updateProfile({
                                userId: item.id,
                                profileId: profile.id,
                            })
                        }
                        key={profile.id}
                    >
                        {profile?.name}
                    </Menu.Item>
                ))}
            </Menu>
        </AuthGuard>
    );
}
function Role({ item }: { item: Item }) {
    const ctx = useTable();
    // const roles = ctx.tableMeta?.filterData?.find(
    //     (a) => a.value == "roleId",
    // )?.options;
    const [opened, setOpened] = useState(false);
    const roles = useRolesList(opened);
    const { mutate: updateRole, isPending } = useMutation(
        useTRPC().hrm.updateEmployeeRole.mutationOptions({
            onSuccess(data, variables, context) {
                invalidateInfiniteQueries("hrm.getEmployees");
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    return (
        <AuthGuard
            rules={[_perm.is("editRole")]}
            Fallback={<Badge variant="secondary">{item.role}</Badge>}
        >
            <Menu
                open={opened}
                onOpenChanged={setOpened}
                label={item.role || "Role not set"}
                Icon={null}
                variant={item?.role ? "secondary" : "destructive"}
                hoverVariant="default"
                triggerSize="xs"
                className="h-[40vh] overflow-auto"
            >
                {roles?.map((role) => (
                    <Menu.Item
                        onClick={(e) =>
                            updateRole({
                                userId: item.id,
                                roleId: role.id,
                            })
                        }
                        key={role.id}
                    >
                        {role?.name}
                    </Menu.Item>
                ))}
            </Menu>
        </AuthGuard>
    );
}
