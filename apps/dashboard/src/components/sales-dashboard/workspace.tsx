"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { SalesDashboardHeader } from "@/components/sales-dashboard/header";
import {
	SalesChannelCard,
	SalesRecentOrdersCard,
	SalesRepPerformanceCard,
	SalesTopProductsCard,
} from "@/components/sales-dashboard/performance-grid";
import {
	SalesDashboardSummary,
	SalesDashboardSummarySkeleton,
} from "@/components/sales-dashboard/summary";
import { SalesBookedTrendCard } from "@/components/sales-dashboard/trend-card";
import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function SalesDashboardWorkspace() {
	return (
		<div className="space-y-5">
			<SalesDashboardHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<SalesDashboardSummarySkeleton />}>
					<SalesDashboardSummary />
				</Suspense>
			</ErrorBoundary>
			<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesBookedTrendCard />
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesRecentOrdersCard />
				</ErrorBoundary>
			</div>
			<div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesRepPerformanceCard />
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesTopProductsCard />
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesChannelCard />
				</ErrorBoundary>
			</div>
		</div>
	);
}

export function SalesDashboardWorkspaceSkeleton() {
	return (
		<div className="space-y-5">
			<div className="h-24 animate-pulse rounded-xl bg-muted" />
			<SalesDashboardSummarySkeleton />
			<div className="grid gap-4 xl:grid-cols-2">
				{["trend", "recent"].map((id) => (
					<Card key={id}>
						<CardHeader>
							<div className="h-6 w-40 animate-pulse rounded bg-muted" />
						</CardHeader>
						<CardContent>
							<div className="h-[320px] animate-pulse rounded bg-muted" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
