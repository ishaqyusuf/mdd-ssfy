"use client";

import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
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
import { InvoiceRow } from "./sales/sales-row";
import { WidgetListSkeleton } from "./widget-skeleton";

export function RecentSalesWidget() {
	const { params } = useSalesDashboardParams();
	const trpc = useTRPC();
	const { data, isLoading } = useQuery(
		trpc.salesDashboard.getRecentSales.queryOptions(),
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
				<CardTitle>Recent Sales</CardTitle>
				<CardDescription>
					You made {data?.length} sales recently.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
				<ul className="bullet-none max-h-[280px] cursor-pointer divide-y overflow-auto scrollbar-hide sm:max-h-[420px]">
					{data?.map((invoice) => {
						return <InvoiceRow key={invoice.id} invoice={invoice} />;
					})}
				</ul>
				{/* {data?.map((sale) => (
                    <div className="flex items-center" key={sale.id}>
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>
                                {sale.customerName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {sale.customerName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {sale.orderId}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            +${sale.amount.toLocaleString()}
                        </div>
                    </div>
                ))} */}
			</CardContent>
		</Card>
	);
}
