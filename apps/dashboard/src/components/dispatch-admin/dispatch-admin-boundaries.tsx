"use client";

import {
	DispatchAdminSummary,
	DispatchAdminSummarySkeleton,
} from "@/components/dispatch-admin/dispatch-admin-summary";
import { ErrorFallback } from "@/components/error-fallback";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

function DispatchSummaryError({ error }: { error?: unknown }) {
	return (
		<div className="min-h-36 rounded-xl border border-dashed bg-muted/10 p-6">
			<ErrorFallback error={error} />
		</div>
	);
}

export function DispatchAdminSummaryBoundary({
	showOverdueAlert = false,
}: {
	showOverdueAlert?: boolean;
}) {
	return (
		<ErrorBoundary errorComponent={DispatchSummaryError}>
			<Suspense fallback={<DispatchAdminSummarySkeleton />}>
				<DispatchAdminSummary showOverdueAlert={showOverdueAlert} />
			</Suspense>
		</ErrorBoundary>
	);
}

export function DispatchDataBoundary({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback: React.ReactNode;
}) {
	return (
		<ErrorBoundary errorComponent={ErrorFallback}>
			<Suspense fallback={fallback}>{children}</Suspense>
		</ErrorBoundary>
	);
}
