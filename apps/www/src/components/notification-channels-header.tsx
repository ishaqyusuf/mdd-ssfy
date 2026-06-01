"use client";

import { notificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

export function NotificationChannelHeader() {
	const trpc = useTRPC();
	return (
		<div className="flex px-4 justify-between">
			<SearchFilter
				filterSchema={notificationChannelFilterParams}
				placeholder="Search NotificationChannels..."
				trpcRoute={trpc.filters.notificationChannel}
			/>
			<div className="flex-1" />
		</div>
	);
}
