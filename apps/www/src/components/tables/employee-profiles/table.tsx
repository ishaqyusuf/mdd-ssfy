"use client";

import React, { use } from "react";

import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";

import { useAction } from "next-safe-action/hooks";

import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";

import { TableProvider } from "..";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";

import { columns, Item } from "./columns";
import { LoadMore } from "../load-more";
import { useRolesParams } from "@/hooks/use-roles-params";
import Portal from "@/components/_v1/portal";
import { Icons } from "@gnd/ui/icons";
import { deleteRoleAction } from "@/actions/delete-role-action";
import { generateRandomString } from "@/lib/utils";

type Props = {
    data: Item[];
};

export function EmployeeProfilesDataTable({ data }: Props) {
    const { setParams, params } = useRolesParams();

    const role = useRolesParams();
    const toast = useLoadingToast();

    return (
        <TableProvider
            args={[
                {
                    columns,
                    data,
                    setParams,
                    params,
                    tableMeta: {
                        deleteAction(id) {
                            deleteRoleAction(id).then((e) => {
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
                                    profileForm: true,
                                    profileEditId: null,
                                })
                            }
                        >
                            <Icons.Add className="size-4 mr-2" />
                            Create
                        </Button>
                    </div>
                </Portal>
                <Table>
                    <TableHeaderComponent />
                    <TableBody>
                        <TableRow />
                    </TableBody>
                </Table>
                <LoadMore />
            </div>
        </TableProvider>
    );
}
