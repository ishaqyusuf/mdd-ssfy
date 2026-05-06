"use client";

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

export function TopProductsWidget() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const { data, isLoading } = useQuery(
		trpc.salesDashboard.getTopProducts.queryOptions({
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
			<CardHeader
				className="cursor-pointer px-3 py-3 transition-colors hover:bg-muted/40 sm:p-6"
				onClick={() => {
					openLink("/sales-book/top-selling-products");
				}}
			>
				<CardTitle>Top Selling Products</CardTitle>
				<CardDescription>
					Based on sales volume in the last 30 days.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
				<ul className="bullet-none max-h-[280px] cursor-pointer divide-y overflow-auto scrollbar-hide sm:max-h-[420px]">
					{data?.map((product) => {
						return (
							<li
								key={product.id ?? product.name}
								className="h-[57px] items-center flex w-full"
							>
								<button
									type="button"
									className="flex h-full w-full items-center text-left transition-colors hover:bg-muted/50"
									onClick={() => {
										if (!product.id) return;
										openLink(
											`/sales-book/top-selling-products/${product.id}`,
											{},
										);
									}}
								>
									<div className="min-w-0 flex-1 pr-3">
										<span className="block truncate text-sm font-medium uppercase">
											{product.name}
										</span>
									</div>
									<span className="shrink-0 text-end text-sm text-muted-foreground">
										{product.count} units
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}
