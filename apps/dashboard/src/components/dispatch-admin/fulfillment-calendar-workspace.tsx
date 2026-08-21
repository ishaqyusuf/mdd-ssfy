import {
	DispatchCalendarSkeleton,
	DispatchCalendarView,
} from "@/components/dispatch-admin/dispatch-calendar-view";
import { FulfillmentPageTabs } from "@/components/dispatch-admin/fulfillment-page-tabs";
import { ErrorFallback } from "@/components/error-fallback";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function FulfillmentCalendarWorkspace() {
	return (
		<div className="flex flex-col gap-4">
			<div className="min-w-0">
				<FulfillmentPageTabs />
			</div>

			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<DispatchCalendarSkeleton />}>
					<DispatchCalendarView />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
