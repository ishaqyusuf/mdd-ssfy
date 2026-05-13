"use client";

import { _trpc } from "@/components/static-trpc";
import { notificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

export function NotificationChannelHeader() {
	return (
		<div className="flex px-4 justify-between">
			<SearchFilter
				filterSchema={notificationChannelFilterParams}
				placeholder="Search NotificationChannels..."
				trpcRoute={_trpc.filters.notificationChannel}
			/>
			<div className="flex-1" />
		</div>
	);
}
