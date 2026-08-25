import { DispatchOverdueBanner } from "@/components/dispatch-admin/dispatch-overdue-banner";
import {
	DispatchSummaryCards,
	DispatchSummaryCardsSkeleton,
} from "@/components/dispatch-admin/dispatch-summary-cards";
import { ErrorFallback } from "@/components/error-fallback";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function FulfillmentOverview() {
	return (
		<>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DispatchSummaryCardsSkeleton />}>
						<DispatchSummaryCards />
					</Suspense>
				</ErrorBoundary>
			</div>

			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={null}>
					<DispatchOverdueBanner />
				</Suspense>
			</ErrorBoundary>
		</>
	);
}
