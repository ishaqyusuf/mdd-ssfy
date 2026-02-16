"use client";

import { NotificationChannelHeader } from "@/components/notification-channels-header";
import { DataTable } from "./data-table";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { cn } from "node_modules/@gnd/sales/src/sales-template/utils/cn";
import { ScrollArea } from "@gnd/ui/scroll-area";

export default function NotificationChannels() {
    const { openNotificationChannelId } = useNotificationChannelParams();
    return (
        <aside
            className={cn(
                "w-full md:w-sm h-[calc(100vh)]   flex flex-col overflow-hidden  md:fixed md:top-[var(--header-height)] pb-4  z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] gap-4 md:left-[70px]",
                !!openNotificationChannelId && "hidden md:flex",
                "md:border-r border-border",
                "md:pt-4",
            )}
        >
            <NotificationChannelHeader />
            <ScrollArea hideScrollbar className="overflow-auto h-full pb-16">
                <DataTable />
                {/* <div className="h-screen"></div> */}
            </ScrollArea>
        </aside>
    );
}

