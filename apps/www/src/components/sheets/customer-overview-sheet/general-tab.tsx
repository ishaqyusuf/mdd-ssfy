"use client";

import { getCustomerGeneralInfoAction } from "@/actions/get-customer-general-info";
import Money from "@/components/_v1/money";
import { Avatar } from "@/components/avatar";
import { DataSkeleton } from "@/components/data-skeleton";
import Link from "@/components/link";
import { SendSalesReminder } from "@/components/send-sales-reminder";
import { useEffect, type ReactNode } from "react";

import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
	DataSkeletonProvider,
	useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { Clock3, Plus, Truck, Wallet } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";

import { Footer } from "./footer";
import { SalesList } from "./sales-list";

import { CustomerTxDataTable } from "@/components/tables/sales-accounting/table.customer-transaction";

export function GeneralTab({ setCustomerName }) {
	const query = useCustomerOverviewQuery();
	const overviewOpen = useSalesOverviewOpen();

	const loader = async () =>
		await getCustomerGeneralInfoAction(query.accountNo);
	const skel = useCreateDataSkeletonCtx({
		loader,
		autoLoad: true,
	});
	const data = skel?.data;
	useEffect(() => {
		if (data) {
			setCustomerName(data.displayName || data.accountNo);
		}
	}, [data, setCustomerName]);
	return (
		<div className="space-y-4">
			<DataSkeletonProvider value={skel}>
				<div className="flex items-center gap-4">
					<DataSkeleton className="h-16 w-16 rounded-full" placeholder="LOREM">
						<Avatar
							url={data?.avatarUrl}
							name={data?.displayName}
							className="h-16 w-16"
							fallbackClassName="text-lg"
						/>
					</DataSkeleton>
					<div>
						<h3 className="text-lg font-semibold">
							<DataSkeleton placeholder="Ishaq Yusuf">
								{data?.displayName}
							</DataSkeleton>
						</h3>
						<p className="text-sm text-muted-foreground">
							Customer ID:{" "}
							<DataSkeleton as="span" placeholder="234 8186877307">
								{data?.accountNo}
							</DataSkeleton>
						</p>
					</div>
				</div>
				<Card>
					<div className="flex">
						<div className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Wallet Balance</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2">
									<Wallet className="h-4 w-4 text-muted-foreground" />
									<span className="text-2xl font-bold">
										$
										<DataSkeleton as="span" placeholder="$100,000">
											{/* {data?.walletBalance?.toFixed(2)} */}
											<Money noCurrency value={data?.walletBalance} />
										</DataSkeleton>
									</span>
								</div>
							</CardContent>
						</div>
						<div className="border-r" />

						<div className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Pending Payment</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2">
									<Wallet className="h-4 w-4 text-muted-foreground" />
									<span className="text-2xl font-bold">
										$
										<DataSkeleton as="span" placeholder="$100,000">
											<Money noCurrency value={data?.pendingPayment} />
										</DataSkeleton>
									</span>
								</div>
							</CardContent>
						</div>
					</div>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Analytics</CardTitle>
						<CardDescription>
							Sales and delivery status for this customer
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 md:grid-cols-4">
							<AnalyticsCard
								title="Pending payment orders"
								value={data?.pendingPaymentOrders?.length || 0}
								icon={<Wallet className="size-4 text-amber-600" />}
								description={`$${Number(
									data?.pendingPayment || 0
								).toLocaleString()}`}
							/>
							<AnalyticsCard
								title="Pending delivery orders"
								value={data?.pendingDeliveryOrders?.length || 0}
								icon={<Truck className="size-4 text-sky-600" />}
								description="Open delivery work"
							/>
							<AnalyticsCard
								title="Sales orders"
								value={data?.totalSalesCount || 0}
								icon={<Clock3 className="size-4 text-emerald-600" />}
								description={`$${Number(
									data?.totalSalesValue || 0
								).toLocaleString()}`}
							/>
							<AnalyticsCard
								title="Quotes"
								value={data?.totalQuotesCount || 0}
								icon={<Clock3 className="size-4 text-violet-600" />}
								description={`$${Number(
									data?.totalQuotesValue || 0
								).toLocaleString()}`}
							/>
						</div>
						<div className="grid gap-4 lg:grid-cols-2">
							<AnalyticsListCard
								title="Pending payment"
								description="Orders that still have a balance due"
								emptyText="No pending payment orders."
								items={data?.pendingPaymentOrders || []}
								renderAction={(item) => (
									<Button
										size="sm"
										variant="ghost"
										onClick={() =>
											overviewOpen.openSalesAdminSheet(item.orderId)
										}
									>
										Open
									</Button>
								)}
								renderMeta={(item) => (
									<Badge variant="outline">
										${Number(item.amountDue || 0).toLocaleString()}
									</Badge>
								)}
							/>
							<AnalyticsListCard
								title="Pending delivery"
								description="Orders not yet marked as completed for delivery"
								emptyText="No pending delivery orders."
								items={data?.pendingDeliveryOrders || []}
								renderAction={(item) => (
									<Button
										size="sm"
										variant="ghost"
										onClick={() =>
											overviewOpen.openSalesAdminSheet(item.uuid)
										}
									>
										Open
									</Button>
								)}
								renderMeta={(item) => (
									<Badge variant="outline">
										{item.status?.delivery?.status || "Pending"}
									</Badge>
								)}
							/>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Quick actions</CardTitle>
						<CardDescription>
							Common customer actions from one place
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2 md:grid-cols-3">
						<SendSalesReminder
							salesIds={(data?.pendingPaymentOrders || []).map((sale) => sale.id)}
						>
							<Button
								className="w-full justify-start"
								disabled={!data?.pendingPaymentOrders?.length}
								variant="outline"
							>
								<Wallet className="mr-2 size-4" />
								Send payment reminder
							</Button>
						</SendSalesReminder>
						<Button asChild className="w-full justify-start" variant="outline">
							<Link href="/sales-book/create-quote">
								<Plus className="mr-2 size-4" />
								Create new quote
							</Link>
						</Button>
						<Button asChild className="w-full justify-start">
							<Link href="/sales-book/create-order">
								<Plus className="mr-2 size-4" />
								Create new sales
							</Link>
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Recent Transactions</CardTitle>
						<CardDescription>Last 5 transactions</CardDescription>
					</CardHeader>
					<CardContent>
						{!skel.loading && !skel.data?.recentTx?.length ? (
							<>
								<div className="flex h-40 items-center justify-center">
									<p className="text-muted-foreground">
										No customer transaction data available
									</p>
								</div>
							</>
						) : (
							<div className="flex flex-col w-full overflow-auto">
								<CustomerTxDataTable data={data?.recentTx ?? []} />
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Recent Sales</CardTitle>
						<CardDescription>Last 5 orders</CardDescription>
					</CardHeader>
					<CardContent>
						<SalesList data={skel.data?.recentSales} />
					</CardContent>
				</Card>
				<Footer />
			</DataSkeletonProvider>
		</div>
	);
}

function AnalyticsCard({
	description,
	icon,
	title,
	value,
}: {
	title: string;
	value: number;
	description: string;
	icon: ReactNode;
}) {
	return (
		<div className="rounded-lg border bg-muted/20 p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="text-sm text-muted-foreground">{title}</div>
				{icon}
			</div>
			<div className="text-2xl font-semibold">{value}</div>
			<div className="text-xs text-muted-foreground">{description}</div>
		</div>
	);
}

function AnalyticsListCard({
	description,
	emptyText,
	items,
	renderAction,
	renderMeta,
	title,
}: {
	title: string;
	description: string;
	emptyText: string;
	items: any[];
	renderMeta: (item: any) => ReactNode;
	renderAction: (item: any) => ReactNode;
}) {
	return (
		<div className="rounded-lg border">
			<div className="border-b p-3">
				<div className="font-medium">{title}</div>
				<div className="text-xs text-muted-foreground">{description}</div>
			</div>
			<div className="divide-y">
				{items.length ? (
					items.slice(0, 5).map((item) => (
						<div
							key={`${item.orderId}-${item.id || item.uuid}`}
							className="flex items-center justify-between gap-3 p-3"
						>
							<div>
								<div className="font-medium">{item.orderId}</div>
								<div className="text-xs text-muted-foreground">
									{item.customerName || item.displayName || "-"}
								</div>
							</div>
							<div className="flex items-center gap-2">
								{renderMeta(item)}
								{renderAction(item)}
							</div>
						</div>
					))
				) : (
					<div className="p-6 text-sm text-muted-foreground">{emptyText}</div>
				)}
			</div>
		</div>
	);
}
