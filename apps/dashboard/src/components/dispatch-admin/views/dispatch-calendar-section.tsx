"use client";

import {
	DispatchDataBoundary,
} from "@/components/dispatch-admin/dispatch-admin-boundaries";
import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import {
	DispatchCalendarSkeleton,
	DispatchCalendarView,
} from "@/components/dispatch-admin/dispatch-calendar-view-v2";

export function DispatchCalendarSection() {
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminHeader />
			<DispatchDataBoundary fallback={<DispatchCalendarSkeleton />}>
				<DispatchCalendarView />
			</DispatchDataBoundary>
		</div>
	);
}
