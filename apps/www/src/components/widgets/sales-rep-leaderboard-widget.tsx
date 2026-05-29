"use client";

import { Avatar } from "@/components/avatar";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { WidgetListSkeleton } from "./widget-skeleton";

export function SalesRepLeaderboardWidget() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const { data, isLoading } = useQuery(
		trpc.salesDashboard.getSalesRepLeaderboard.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);
	if (isLoading)
		return (
			<Card className="shadow-none sm:shadow-sm">
				<CardHeader className="px-3 py-3 sm:p-6">
					<CardTitle>
						<Skeleton className="h-[32px] w-[56px]" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-[16px] w-[56px]" />
					</CardDescription>
				</CardHeader>
				<CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
					<ul className="bullet-none max-h-[280px] cursor-pointer divide-y overflow-auto scrollbar-hide sm:max-h-[420px]">
						<WidgetListSkeleton />
					</ul>
				</CardContent>
			</Card>
		);
	return (
		<Card className="shadow-none sm:shadow-sm">
			<CardHeader className="px-3 py-3 sm:p-6">
				<CardTitle>Sales Rep Leaderboard</CardTitle>
				<CardDescription>
					Top performers for the selected date range.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
				<ul className="bullet-none max-h-[280px] cursor-pointer divide-y overflow-auto scrollbar-hide sm:max-h-[420px]">
					{data?.length ? null : (
						<li className="flex h-[114px] items-center justify-center px-4 text-center">
							<p className="text-sm text-muted-foreground">
								No sales reps found for the selected date range.
							</p>
						</li>
					)}
					{data?.map((rep) => (
						<li key={rep.id}>
							<button
								type="button"
								className="flex h-[57px] w-full min-w-0 items-center text-left transition-colors hover:bg-muted/50"
								onClick={() => {
									openLink("/sales-book/accounting", {
										salesRepId: rep.id,
										from: params.from,
										to: params.to,
									});
								}}
							>
								<Avatar
									name={rep.name}
									className="h-9 w-9"
									fallbackClassName="text-sm"
								/>
								<div className="ml-3 min-w-0 flex-1 space-y-1">
									<p className="truncate text-sm font-medium leading-none">
										{rep.name}
									</p>
								</div>
								<div className="ml-3 shrink-0 text-sm font-medium sm:text-base">
									${rep.totalSales.toLocaleString()}
								</div>
							</button>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
