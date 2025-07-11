"use client";

import React, { useEffect, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import Link from "next/link";
import {
    archiveAction,
    getNotificationCountAction,
    INotification,
    loadNotificationsAction,
    markAsReadAction,
} from "@/app/(v1)/_actions/notifications";
import dayjs from "@/lib/dayjs";
import { deepCopy } from "@/lib/deep-copy";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { dispatchSlice } from "@/store/slicers";
import { AlertTriangle, Archive, Bell, Dot } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { Badge } from "@gnd/ui/badge";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Btn from "./btn";
import LinkableNode from "./link-node";
import { ToolTip } from "./tool-tip";

export default function NotificationComponent({}) {
    const [notificationCount, setNotificationCount] = useState(0);
    const notifications = useAppSelector(
        (state) => state.slicers?.notifications,
    );

    useEffect(() => {
        // Fetch notification count from the server
        const fetchNotificationCount = async () => {
            const count = await getNotificationCountAction();
            setNotificationCount(count as any);
        };
        fetchNotificationCount();
        const intervalId = setInterval(fetchNotificationCount, 1000 * 60 * 30);

        return () => {
            clearInterval(intervalId);
        };
    }, []);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (open) loadNotifications();
    }, [open]);
    async function loadNotifications() {
        const list = await loadNotificationsAction();
        const items = list.map((item) => {
            const { archivedAt, createdAt, updatedAt, ..._item } = item;
            _item.time = dayjs(createdAt).fromNow();
            _item.archived = archivedAt != null;
            if (_item.alert && !_item.deliveredAt) {
                if (typeof window !== "undefined" && "Notification" in window) {
                    Notification.requestPermission().then(() => {
                        if (Notification.permission === "granted") {
                            new Notification(_item.message, {
                                body: `${item.message}`,
                                // icon: "/icons/notification-icon.png", // Optional: Add an icon
                            });
                        }
                    });
                }
            }
            return _item;
        });

        dispatchSlice("notifications", items);
    }
    return (
        <div>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        aria-label="Notification"
                        variant="outline"
                        size="sm"
                        className={cn(
                            "relative h-auto space-x-2  rounded-full",
                            notificationCount > 0 ? "p-1" : "p-1",
                        )}
                    >
                        <Bell className="size-4 text-muted-foreground" />
                        {notificationCount > 0 && (
                            <Badge
                                variant="default"
                                className="p-0.5 px-1 leading-none"
                            >
                                {notificationCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="relative z-[999] w-[400px] rounded-lg bg-white shadow-xl"
                >
                    <Tabs defaultValue="inbox" className="">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="inbox">Inbox</TabsTrigger>
                            <TabsTrigger value="archive">Archive</TabsTrigger>
                        </TabsList>
                        <TabsContent value="inbox">
                            <NotificationList type="inbox" setOpen={setOpen} />
                            <div className="flex items-center justify-center border-t p-2">
                                <Button variant="ghost">Archive All</Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="archive">
                            <NotificationList
                                setOpen={setOpen}
                                type="archive"
                            />
                        </TabsContent>
                    </Tabs>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
function NotificationList({
    type,
    setOpen,
}: {
    type: "inbox" | "archive";
    setOpen;
}) {
    const notifications = useAppSelector(
        (state) => state.slicers.notifications,
    );

    return (
        <ScrollArea className="  -mt-2 h-[350px] min-h-[400px] ">
            <div className="divide-y">
                {// Array(30)
                //   .fill(null)
                //   .map((a) => notifications?.[0] as any)
                //   .filter(Boolean)
                notifications?.map((item, index) => (
                    <NotificationItem
                        type={type}
                        onClick={() => {
                            setOpen(false);
                        }}
                        key={index}
                        index={index}
                        item={item}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}
function NotificationItem({
    item,
    index,
    type,
    onClick,
}: {
    item: INotification;
    index;
    onClick;
    type;
}) {
    const visible = type == "inbox" ? !item.archived : item.archived;
    const notifications = useAppSelector(
        (state) => state.slicers.notifications,
    );
    const [archiving, startTransition] = useTransition();
    if (!visible) return null;
    function archive() {
        startTransition(async () => {
            await archiveAction(item.id, item.seenAt);
            let len = notifications.length;
            if (!item.seenAt)
                dispatchSlice("notifications", [
                    ...notifications.slice(0, len - index),
                    {
                        ...deepCopy(item),
                        archived: true,
                    },
                    ...notifications.slice(index + 1),
                ]);
        });
    }
    return (
        <div className="group relative" key={item.id}>
            <Button variant="ghost" className="h-full w-full border-b p-4 py-3">
                <LinkableNode
                    href={item.link
                        ?.replace("/hrm/jobs", "/contractor/jobs")
                        ?.replace("/jobs", "/contractor/jobs")}
                    onClick={async () => {
                        if (!item.seenAt) await markAsReadAction(item.id);
                        onClick();
                    }}
                    className="mr-10 flex w-full items-center justify-start text-start"
                >
                    <div className="">
                        <div className=" rounded-full border bg-amber-50 p-1.5">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>
                    <div className="ml-4 space-y-1 ">
                        <p
                            className={cn(
                                "text-sm  leading-snug",
                                !item.seenAt ? "font-medium" : "font-normal",
                            )}
                        >
                            {item.message}
                        </p>
                        <p className="text-sm leading-none text-muted-foreground">
                            {item.time}
                        </p>
                    </div>
                </LinkableNode>
            </Button>
            {type == "inbox" && (
                <div className="absolute right-0 top-0 m-4 ml-auto flex flex-col items-end font-medium">
                    <div className="hidden group-hover:block">
                        <ToolTip info="Archive">
                            <Btn
                                isLoading={archiving}
                                onClick={archive}
                                variant="secondary"
                                size="icon"
                            >
                                <Archive className="size-4" />
                            </Btn>
                        </ToolTip>
                    </div>
                    {!item.seenAt && (
                        <Dot className="h-10 w-10 text-blue-700" />
                    )}
                </div>
            )}
        </div>
    );
}
