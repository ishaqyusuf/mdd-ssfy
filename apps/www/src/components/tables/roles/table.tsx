"use client";

import React, { use } from "react";

import { useLoadingToast } from "@/hooks/use-loading-toast";

import { Button } from "@gnd/ui/button";
import { Table } from "@gnd/ui/data-table";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { columns, Item, mobileColumn } from "./columns";
import { useRolesParams } from "@/hooks/use-roles-params";
import Portal from "@/components/_v1/portal";
import { Icons } from "@gnd/ui/icons";
import { deleteRoleAction } from "@/actions/delete-role-action";
import { generateRandomString } from "@/lib/utils";
import { deleteProfileAction } from "@/actions/delete-profile-action";

type Props = {
    data: Item[];
};

export function RolesDataTable({ data }: Props) {
    const { setParams, params } = useRolesParams();

    const role = useRolesParams();
    const toast = useLoadingToast();

    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
                    setParams,
                    tableMeta: {
                        deleteAction(id) {
                            deleteProfileAction(id).then((e) => {
                                setParams({
                                    refreshToken: generateRandomString(),
                                });
                            });
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4">
                <Portal noDelay nodeId={"tabActions"}>
                    <div className="flex">
                        <div className="flex-1"></div>
                        <Button
                            onClick={() =>
                                setParams({
                                    roleForm: true,
                                    roleEditId: null,
                                })
                            }
                        >
                            <Icons.Add className="size-4 mr-2" />
                            Create
                        </Button>
                    </div>
                </Portal>
                <Table>
                    <Table.TableHeader />
                    <Table.Body>
                        <Table.TableRow />
                    </Table.Body>
                </Table>
            </div>
        </Table.Provider>
    );
}
