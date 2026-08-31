"use client";

import { PageTabs } from "@/components/page-tabs";
import type { DriverView } from "./model";

export function DriverRouteListTabs({
	counts,
	view,
}: {
	counts: { today: number; all: number; completed: number };
	view: DriverView;
}) {
	const routeTabs = [
		{ title: "Today", count: counts.today, params: { view: "today" } },
		{ title: "All stops", count: counts.all, params: { view: "all" } },
		{
			title: "Completed",
			count: counts.completed,
			params: { view: "completed" },
		},
	];

	return (
		<PageTabs
			className="w-full lg:w-[390px]"
			fixedTabs={routeTabs}
			portal={false}
			showAll={false}
			tabs={[]}
			activeParams={{ view }}
			maxVisible={{ base: 3, lg: 3, "2xl": 3 }}
		/>
	);
}
