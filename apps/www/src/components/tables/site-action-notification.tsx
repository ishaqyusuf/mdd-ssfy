"use client";

import React, { use, useState } from "react";
import { addUserToSiteActionNotification } from "@/actions/add-user-to-site-action-notification";
import { getActionNotifications } from "@/actions/cache/get-action-notifications";
import { removeUserFromSiteActionNotification } from "@/actions/remove-user-from-site-action-notification";
import { toggleSiteActionNotification } from "@/actions/toggle-site-action-notification";
import { getUsersListAction } from "@/data-actions/users/get-users";
import { AsyncFnType } from "@/types";
import { Events } from "@/utils/constants";
import { ChevronDown } from "lucide-react";

import {
    Combobox,
    ComboboxAnchor,
    ComboboxBadgeItem,
    ComboboxBadgeList,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxTrigger,
} from "@gnd/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { Checkbox } from "@gnd/ui/checkbox";

interface UseData {
    data: AsyncFnType<typeof getActionNotifications>;
    users: AsyncFnType<typeof getUsersListAction>;
}
export function SiteActionNotificationTable({ dataPromise, userPromise }) {
    const data = use<UseData["data"]>(dataPromise);
    const users = use<UseData["users"]>(userPromise);
    if (!users || !data) return;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-56">Event</TableHead>
                    <TableHead className="w-24 text-center">Enable</TableHead>
                    <TableHead>Users</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((e) => (
                    <TableRow key={e.id}>
                        <TableCell className="font-mono">
                            {Events?.[e.event]?.split("_").join(" ")}
                        </TableCell>
                        <EnableCell actionId={e.id} checked={e.enabled} />
                        <UsersCell action={e} users={users} />
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
function EnableCell({ actionId, checked }) {
    return (
        <TableCell align="center">
            <Checkbox
                checked={checked}
                onCheckedChange={(e) => {
                    // console.log({ e });
                    toggleSiteActionNotification(actionId, e).then((e) => {});
                }}
            />
        </TableCell>
    );
}
interface UserCellProps {
    action: UseData["data"][number];
    users: UseData["users"];
}
function UsersCell({ action, users }: UserCellProps) {
    const userIds = action?.activeUsers?.map((a) => a.userId);
    const [open, onOpenChange] = useState(false);
    async function updateSelection(s) {
        // console.log(s);
        const newIds = s
            ?.map((a) => Number(a))
            .filter((s) => !userIds?.includes(s));
        await Promise.all(
            newIds?.map(async (id) => {
                await addUserToSiteActionNotification(action.id, id);
            }),
        );
        // console.log(newIds);
    }
    const [content, setContent] = React.useState<React.ComponentRef<
        typeof ComboboxContent
    > | null>(null);
    const [inputValue, setInputValue] = React.useState("");
    const onInputValueChange = React.useCallback(
        (value: string) => {
            setInputValue(value);
            if (content) {
                content.scrollTop = 0; // Reset scroll position
                //  virtualizer.measure();
            }
        },
        [content],
    );
    return (
        <div>
            <Combobox
                open={open}
                onOpenChange={onOpenChange}
                value={userIds.map((id) => String(id))}
                onValueChange={updateSelection}
                multiple
                inputValue={inputValue}
                onInputValueChange={onInputValueChange}
                manualFiltering
                className="w-full"
                autoHighlight
            >
                <ComboboxAnchor className="h-full min-h-10 flex-wrap px-3 py-2">
                    <ComboboxBadgeList>
                        {action?.activeUsers?.map((item, index) => {
                            const usr = users.find((u) => u.id == item.userId);
                            return (
                                <ComboboxBadgeItem
                                    onDelete={(e) => {
                                        e.preventDefault();
                                        removeUserFromSiteActionNotification(
                                            action.id,
                                            item.id,
                                        ).then((e) => {});
                                    }}
                                    key={index}
                                    value={String(item.userId)}
                                >
                                    {usr.name}
                                </ComboboxBadgeItem>
                            );
                        })}
                    </ComboboxBadgeList>

                    <>
                        <ComboboxInput
                            className="h-auto min-w-20 flex-1"
                            onFocus={(e) => {
                                onOpenChange(true);
                            }}
                            placeholder="Select users..."
                        />
                        <ComboboxTrigger className="absolute right-2 top-3">
                            <ChevronDown className="h-4 w-4" />
                        </ComboboxTrigger>
                    </>
                </ComboboxAnchor>

                {
                    <ComboboxContent
                        ref={(node) => setContent(node)}
                        className="relative max-h-[300px] overflow-y-auto overflow-x-hidden"
                    >
                        <ComboboxEmpty>No user found</ComboboxEmpty>
                        {users?.map((trick) => (
                            <ComboboxItem
                                key={String(trick.id)}
                                value={String(trick.id)}
                                outset
                            >
                                {trick.name}
                            </ComboboxItem>
                        ))}
                    </ComboboxContent>
                }
            </Combobox>
        </div>
    );
}
