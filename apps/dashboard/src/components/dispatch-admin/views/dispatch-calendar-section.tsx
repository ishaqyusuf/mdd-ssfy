"use client";

import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import {
	DispatchAdminSummary,
	DispatchAdminSummarySkeleton,
} from "@/components/dispatch-admin/dispatch-admin-summary";
import { DispatchCalendarView } from "@/components/dispatch-admin/dispatch-calendar-view-v2";
import { Suspense } from "react";

export function DispatchCalendarSection() {
	return (
		<div className="flex flex-col gap-4">
			<Suspense fallback={<DispatchAdminSummarySkeleton />}>
				<DispatchAdminSummary />
			</Suspense>
			<DispatchAdminHeader />
			<DispatchCalendarView />
		</div>
	);
}
