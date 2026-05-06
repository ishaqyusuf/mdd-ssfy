"use client";

import { ResponsiveMetric } from "@/components/responsive-metric";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import type { SalesDashboardParamsState } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";

type SalesKpiData = {
	totalRevenue: number;
	totalDue: number;
	newSales: number;
	newQuotes: number;
	activeProductionOrders: number;
};

export function SalesKpiWidgets({
	initialData,
	initialParams,
}: {
	initialData?: SalesKpiData;
	initialParams?: Pick<SalesDashboardParamsState, "from" | "to">;
}) {
	const { params } = useSalesDashboardParams();
	const effectiveParams = initialParams ?? params;
	const trpc = useTRPC();
	const { data, isLoading } = useQuery(
		trpc.salesDashboard.getKpis.queryOptions(
			{
				from: effectiveParams.from,
				to: effectiveParams.to,
			},
			initialData
				? {
						initialData,
					}
				: undefined,
		),
	);
	if (isLoading) {
		return <SalesKpiWidgetsSkeleton />;
	}

	return (
		<div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background [&>*:nth-child(-n+2)]:border-t-0 sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-4">
			<ResponsiveMetric
				title="Total Sales"
				value={`$${data?.totalRevenue.toLocaleString()}`}
				icon={Icons.DollarSign}
			/>
			<ResponsiveMetric
				title="Amount Due"
				value={`$${data?.totalDue.toLocaleString()}`}
				icon={Icons.Activity}
			/>
			<ResponsiveMetric
				title="New Sales"
				value={`+${data?.newSales}`}
				icon={Icons.CreditCard}
			/>
			<ResponsiveMetric
				title="New Quotes"
				value={`+${data?.newQuotes}`}
				icon={Icons.List}
			/>
		</div>
	);
}

export function SalesKpiWidgetsSkeleton() {
	const skeletonItems = [
		"total-sales",
		"amount-due",
		"new-sales",
		"new-quotes",
	];

	return (
		<div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background [&>*:nth-child(-n+2)]:border-t-0 sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-4">
			{skeletonItems.map((item) => (
				<Card
					key={item}
					className="min-w-0 rounded-none border-0 border-border/70 border-t bg-transparent shadow-none first:border-t-0 odd:border-r sm:rounded-lg sm:border sm:bg-card sm:shadow-sm sm:first:border-t sm:odd:border-r-0"
				>
					<div className="px-3 py-2.5 sm:hidden">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="mt-2 h-6 w-24" />
					</div>
					<div className="hidden sm:block">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								<Skeleton className="h-[20px] w-24" />
							</CardTitle>
							<Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-[32px] w-24" />
						</CardContent>
					</div>
				</Card>
			))}
		</div>
	);
}
