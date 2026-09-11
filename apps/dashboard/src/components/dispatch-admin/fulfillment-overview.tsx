import { DispatchOverdueBanner } from "@/components/dispatch-admin/dispatch-overdue-banner";
import { ErrorFallback } from "@/components/error-fallback";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function FulfillmentOverview() {
	return (
		<ErrorBoundary errorComponent={ErrorFallback}>
			<Suspense fallback={null}>
				<DispatchOverdueBanner />
			</Suspense>
		</ErrorBoundary>
	);
}
