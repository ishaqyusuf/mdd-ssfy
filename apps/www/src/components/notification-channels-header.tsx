"use client";
import { SearchFilter } from "@gnd/ui/search-filter";

import { notificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function NotificationChannelHeader({}) {
    const [filters, setFilters] = useQueryStates(
        notificationChannelFilterParams,
    );
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={notificationChannelFilterParams}
                placeholder="Search NotificationChannels..."
                trpcRoute={_trpc.filters.notificationChannel}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
        </div>
    );
}

