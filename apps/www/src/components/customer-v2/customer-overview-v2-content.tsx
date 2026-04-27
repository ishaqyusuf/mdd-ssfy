"use client";

import { Icons } from "@gnd/ui/icons";

import Link from "@/components/link";
import { SendSalesReminder } from "@/components/send-sales-reminder";
import { TransactionsTab } from "@/components/sheets/customer-overview-sheet/transactions-tab";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import textWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = {
	accountNo: string;
	defaultTab?: "overview" | "sales" | "quotes" | "transactions";
	initialOverviewData?: CustomerOverviewV2Data;
};

const TextWithTooltip = textWithTooltip;

export function CustomerOverviewV2Content({
	accountNo,
	defaultTab = "overview",
	initialOverviewData,
}: Props) {
	const trpc = useTRPC();
	const overviewQuery = useQuery(
		trpc.customer.getCustomerOverviewV2.queryOptions(
			{ accountNo },
			{
				initialData: initialOverviewData,
			},
		),
	);
	const [activeTab, setActiveTab] = useState(defaultTab);
	const data = overviewQuery.data;
	const salesOverviewOpen = useSalesOverviewOpen();
	const pendingPaymentIds = useMemo(
		() => data?.general.pendingPaymentOrders?.map((sale) => sale.id) || [],
		[data],
	);

	return (
		<div className="flex flex-col gap-6">
			<CustomerHero
				data={data}
				isPending={overviewQuery.isPending}
				pendingPaymentIds={pendingPaymentIds}
			/>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as typeof activeTab)}
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="sales">Sales</TabsTrigger>
					<TabsTrigger value="quotes">Quotes</TabsTrigger>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4">
					<div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
						<div className="grid gap-4">
							<CustomerSummaryCards
								data={data}
								isPending={overviewQuery.isPending}
							/>
							<AccountHealthCard
								data={data}
								isPending={overviewQuery.isPending}
							/>
							<CustomerSalesPreview
								emptyText="No sales orders found for this customer."
								items={data?.salesWorkspace.orders || []}
								onOpenSheet={(orderNo) =>
									salesOverviewOpen.openSalesAdminSheet(orderNo)
								}
								onOpenPage={(orderNo) =>
									salesOverviewOpen.openSalesAdminPage(orderNo)
								}
								title="Recent sales"
								type="order"
							/>
							<CustomerSalesPreview
								emptyText="No quotes found for this customer."
								items={data?.salesWorkspace.quotes || []}
								onOpenSheet={(orderNo) =>
									salesOverviewOpen.openQuoteSheet(orderNo)
								}
								onOpenPage={(orderNo) =>
									salesOverviewOpen.openQuotePage(orderNo)
								}
								title="Recent quotes"
								type="quote"
							/>
						</div>
						<div className="grid gap-4">
							<RecentActivityCard
								data={data}
								isPending={overviewQuery.isPending}
							/>
							<CustomerContactCard
								data={data}
								isPending={overviewQuery.isPending}
							/>
							<CustomerLocationCard
								data={data}
								isPending={overviewQuery.isPending}
							/>
							<CustomerPendingActions
								data={data}
								isPending={overviewQuery.isPending}
							/>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="sales" className="mt-4">
					<CustomerSalesPreview
						emptyText="No sales orders found for this customer."
						items={data?.salesWorkspace.orders || []}
						onOpenSheet={(orderNo) =>
							salesOverviewOpen.openSalesAdminSheet(orderNo)
						}
						onOpenPage={(orderNo) =>
							salesOverviewOpen.openSalesAdminPage(orderNo)
						}
						showAll
						title="Sales orders"
						type="order"
					/>
				</TabsContent>

				<TabsContent value="quotes" className="mt-4">
					<CustomerSalesPreview
						emptyText="No quotes found for this customer."
						items={data?.salesWorkspace.quotes || []}
						onOpenSheet={(orderNo) => salesOverviewOpen.openQuoteSheet(orderNo)}
						onOpenPage={(orderNo) => salesOverviewOpen.openQuotePage(orderNo)}
						showAll
						title="Quotes"
						type="quote"
					/>
				</TabsContent>

				<TabsContent value="transactions" className="mt-4">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>Customer transactions</CardTitle>
							<CardDescription>
								Recent transaction history for{" "}
								{data?.customer.displayName || accountNo}.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<TransactionsTab accountNo={accountNo} />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

type CustomerOverviewV2Data = {
	accountNo: string;
	customer: {
		id: number | null;
		name: string | null;
		businessName: string | null;
		displayName: string;
		email: string | null;
		phoneNo: string | null;
		phoneNo2: string | null;
		address: string | null;
		profileName: string | null;
		profileId: number | null;
		netTerm: string | null;
		isBusiness: boolean;
	};
	addresses: {
		primary: CustomerAddress | null;
		secondary: CustomerAddress[];
	};
	walletBalance: number;
	health: {
		status:
			| "attention_needed"
			| "credit_available"
			| "delivery_in_progress"
			| "clear";
		label: string;
		description: string;
		nextAction: string;
		recommendedActions: string[];
		netExposure: number;
		creditAvailable: number;
	};
	general: {
		pendingPayment: number;
		pendingPaymentOrders: Array<{
			id: number;
			amountDue?: number | null;
			customerName?: string | null;
			customerEmail?: string | null;
		}>;
		pendingDeliveryOrders: Array<{
			id: number;
			status?: {
				delivery?: {
					status?: string | null;
				};
			} | null;
		}>;
		totalSalesCount: number;
		totalQuotesCount: number;
		totalSalesValue: number;
		totalQuotesValue: number;
	};
	salesWorkspace: {
		orders: CustomerSalesItem[];
		quotes: CustomerSalesItem[];
	};
	recentActivity: Array<{
		id: string;
		type:
			| "order"
			| "quote"
			| "payment"
			| "refund"
			| "wallet"
			| "payment_cancelled";
		title: string;
		subtitle: string;
		amount: number;
		date: string;
		status: string | null;
		orderId: string | null;
	}>;
};

type CustomerAddress = {
	id: number;
	name: string | null;
	email: string | null;
	phoneNo: string | null;
	phoneNo2: string | null;
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	isPrimary: boolean | null;
	meta?: unknown;
};

type CustomerSalesItem = {
	id: number;
	orderId: string;
	uuid: string;
	displayName?: string | null;
	salesDate?: string | null;
	due?: number | null;
	invoice: {
		total: number;
	};
	status?: {
		delivery?: {
			status?: string | null;
		};
	} | null;
};

function CustomerHero({
	data,
	isPending,
	pendingPaymentIds,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
	pendingPaymentIds: number[];
}) {
	return (
		<Card className="overflow-hidden border-border/70">
			<CardContent className="space-y-6 p-6">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-start gap-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
							{getInitials(data?.customer.displayName)}
						</div>
						<div className="space-y-2">
							<div className="flex flex-wrap items-center gap-2">
								{isPending ? (
									<Skeleton className="h-8 w-56 rounded-md" />
								) : (
									<h2 className="text-2xl font-black tracking-tight">
										{data?.customer.displayName || "Customer"}
									</h2>
								)}
								{data?.health ? (
									<Badge variant="secondary">{data.health.label}</Badge>
								) : null}
								<Badge variant="outline">
									{data?.customer.profileName || "Customer"}
								</Badge>
								{data?.customer.isBusiness ? (
									<Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50">
										Business
									</Badge>
								) : null}
							</div>
							<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
								<span>{data?.accountNo}</span>
								<span>{data?.customer.email || "No email"}</span>
								<span>{data?.customer.phoneNo || "No phone"}</span>
							</div>
							{data?.health ? (
								<p className="max-w-2xl text-sm text-muted-foreground">
									{data.health.description}
								</p>
							) : null}
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<SendSalesReminder salesIds={pendingPaymentIds}>
							<Button variant="outline" disabled={!pendingPaymentIds.length}>
								<Icons.Mail className="mr-2 size-4" />
								Send reminder
							</Button>
						</SendSalesReminder>
						<SalesPaymentProcessor
							buttonProps={{ variant: "outline" }}
							customerId={data?.customer.id || undefined}
							disabled={!pendingPaymentIds.length}
							phoneNo={data?.accountNo || ""}
							selectedIds={pendingPaymentIds}
						/>
						<Button asChild variant="outline">
							<Link href="/sales-book/create-quote">
								<Icons.FileText className="mr-2 size-4" />
								New quote
							</Link>
						</Button>
						<Button asChild>
							<Link href="/sales-book/create-order">
								<Icons.ShoppingCart className="mr-2 size-4" />
								New sales
							</Link>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function CustomerSummaryCards({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	const cards = [
		{
			label: "Open balance",
			value: `$${formatMoney(data?.general.pendingPayment || 0)}`,
			description: `${data?.general.pendingPaymentOrders?.length || 0} order(s) still awaiting payment`,
			icon: Icons.ReceiptText,
		},
		{
			label: "Wallet credit",
			value: `$${formatMoney(data?.walletBalance || 0)}`,
			description: "Reusable customer funds already on account",
			icon: Icons.Wallet,
		},
		{
			label: "Net exposure",
			value: `$${formatMoney(data?.health.netExposure || 0)}`,
			description:
				data?.health.creditAvailable && data.health.creditAvailable > 0
					? `$${formatMoney(data.health.creditAvailable)} remains available after covering open balances`
					: "Amount still exposed after applying available wallet funds",
			icon: Icons.Activity,
		},
		{
			label: "Delivery follow-up",
			value: `${data?.general.pendingDeliveryOrders?.length || 0}`,
			description: `${data?.general.totalSalesCount || 0} sales order(s) on this account`,
			icon: Icons.Truck,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{cards.map((card) => {
				const Icon = card.icon;
				return (
					<Card key={card.label}>
						<CardContent className="space-y-3 p-5">
							<div className="flex items-center justify-between">
								<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									{card.label}
								</p>
								<div className="rounded-md bg-primary/10 p-2 text-primary">
									<Icon className="size-4" />
								</div>
							</div>
							<div className="text-2xl font-black">
								{isPending ? (
									<Skeleton className="h-8 w-24 rounded-md" />
								) : (
									card.value
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								{card.description}
							</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

function AccountHealthCard({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Account status</CardTitle>
				<CardDescription>
					What is happening now and the cleanest next move for this customer.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isPending ? (
					<Skeleton className="h-32 rounded-lg" />
				) : (
					<>
						<div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/30 p-4">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Badge variant="secondary">{data?.health.label}</Badge>
									<span className="text-sm text-muted-foreground">
										Net exposure ${formatMoney(data?.health.netExposure || 0)}
									</span>
								</div>
								<p className="text-sm text-muted-foreground">
									{data?.health.description}
								</p>
							</div>
							<div className="min-w-40 rounded-lg border bg-background px-3 py-2 text-sm">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Next best action
								</p>
								<p className="mt-1 font-medium">{data?.health.nextAction}</p>
							</div>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							{(data?.health.recommendedActions || []).map((action) => (
								<div
									key={action}
									className="flex items-start gap-2 rounded-lg border p-3 text-sm"
								>
									<Icons.CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
									<span>{action}</span>
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

function RecentActivityCard({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Recent activity</CardTitle>
				<CardDescription>
					A single timeline for orders, payments, refunds, and wallet movement.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<Skeleton className="h-44 rounded-lg" />
				) : data?.recentActivity?.length ? (
					<div className="space-y-3">
						{data.recentActivity.map((item) => {
							const Icon = getActivityIcon(item.type);
							return (
								<div
									key={item.id}
									className="flex items-start justify-between gap-3 rounded-lg border p-3"
								>
									<div className="flex items-start gap-3">
										<div className="rounded-md bg-primary/10 p-2 text-primary">
											<Icon className="size-4" />
										</div>
										<div className="space-y-1">
											<p className="text-sm font-semibold">{item.title}</p>
											<p className="text-xs text-muted-foreground">
												{item.subtitle}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDate(item.date)}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold">
											{item.amount < 0 ? "-" : ""}$
											{formatMoney(Math.abs(item.amount || 0))}
										</p>
										{item.status ? (
											<Badge
												variant="outline"
												className="mt-1 text-[10px] uppercase"
											>
												{item.status}
											</Badge>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-lg border p-3 text-sm text-muted-foreground">
						No recent account activity yet.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function CustomerContactCard({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	const contacts = [
		{
			label: "Primary",
			value: data?.customer.phoneNo || "No phone",
			icon: Icons.Phone,
		},
		{
			label: "Secondary",
			value:
				data?.customer.phoneNo2 ||
				data?.customer.email ||
				"No secondary contact",
			icon: Icons.Mail,
		},
	];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Quick contacts</CardTitle>
				<CardDescription>
					Fast customer contact details and account basics.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPending ? (
					<Skeleton className="h-28 rounded-lg" />
				) : (
					contacts.map((contact) => {
						const Icon = contact.icon;
						return (
							<div
								key={contact.label}
								className="flex items-center justify-between rounded-lg border p-3"
							>
								<div className="space-y-1">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{contact.label}
									</p>
									<p className="text-sm font-medium">{contact.value}</p>
								</div>
								<Icon className="size-4 text-primary" />
							</div>
						);
					})
				)}
				{isPending ? null : (
					<div className="rounded-lg border p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Payment term
						</p>
						<p className="mt-1 text-sm font-medium">
							{data?.customer.netTerm || "Not configured"}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function CustomerLocationCard({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	const addresses = [
		data?.addresses.primary
			? {
					label: "Primary address",
					value: formatAddress(data.addresses.primary),
				}
			: null,
		...(data?.addresses.secondary || []).slice(0, 2).map((address, index) => ({
			label: `Location ${index + 2}`,
			value: formatAddress(address),
		})),
	].filter(Boolean) as Array<{ label: string; value: string }>;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Locations</CardTitle>
				<CardDescription>
					Billing and shipping context for this customer.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPending ? (
					<Skeleton className="h-28 rounded-lg" />
				) : addresses.length ? (
					addresses.map((address) => (
						<div key={address.label} className="rounded-lg border p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{address.label}
							</p>
							<p className="mt-1 text-sm">
								<TextWithTooltip className="max-w-full" text={address.value} />
							</p>
						</div>
					))
				) : (
					<div className="rounded-lg border p-3 text-sm text-muted-foreground">
						No customer addresses available.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function CustomerPendingActions({
	data,
	isPending,
}: {
	data: CustomerOverviewV2Data | undefined;
	isPending: boolean;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Open work</CardTitle>
				<CardDescription>
					Pending order states that may need follow-up.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPending ? (
					<Skeleton className="h-28 rounded-lg" />
				) : (
					<>
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Recommended next move
							</p>
							<p className="mt-1 text-sm font-medium">
								{data?.health.nextAction}
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Pending payment orders
							</p>
							<p className="mt-1 text-lg font-bold">
								{data?.general.pendingPaymentOrders?.length || 0}
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Pending delivery orders
							</p>
							<p className="mt-1 text-lg font-bold">
								{data?.general.pendingDeliveryOrders?.length || 0}
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Credit left after balances
							</p>
							<p className="mt-1 text-lg font-bold">
								${formatMoney(data?.health.creditAvailable || 0)}
							</p>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

function CustomerSalesPreview({
	emptyText,
	items,
	onOpenPage,
	onOpenSheet,
	showAll = false,
	title,
	type,
}: {
	title: string;
	type: "order" | "quote";
	items: CustomerSalesItem[];
	emptyText: string;
	showAll?: boolean;
	onOpenSheet: (orderNo: string) => void;
	onOpenPage: (orderNo: string) => void;
}) {
	const list = showAll ? items : items.slice(0, 6);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					{type === "order"
						? "Open customer sales with direct v2 overview actions."
						: "Customer quotes with direct v2 overview actions."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{list.length ? (
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
									<th className="pb-3">Reference</th>
									<th className="pb-3">Date</th>
									<th className="pb-3">Amount</th>
									<th className="pb-3">Status</th>
									<th className="pb-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((item) => (
									<tr key={`${type}-${item.id}`}>
										<td className="py-3">
											<div className="font-medium">{item.orderId}</div>
											<div className="text-xs text-muted-foreground">
												{item.displayName || "-"}
											</div>
										</td>
										<td className="py-3 text-sm text-muted-foreground">
											{item.salesDate ? formatDate(item.salesDate) : "-"}
										</td>
										<td className="py-3 text-sm font-medium">
											${formatMoney(item.invoice.total)}
										</td>
										<td className="py-3">
											<Badge variant="outline">
												{type === "order"
													? item.status?.delivery?.status || "Pending"
													: Number(item.due || 0) > 0
														? "Pending"
														: "Ready"}
											</Badge>
										</td>
										<td className="py-3">
											<div className="flex justify-end gap-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => onOpenSheet(item.uuid)}
												>
													Open sheet
												</Button>
												<Button size="sm" onClick={() => onOpenPage(item.uuid)}>
													Open page
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
						{emptyText}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function getInitials(value?: string | null) {
	if (!value) return "CU";
	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}

function getActivityIcon(
	type: CustomerOverviewV2Data["recentActivity"][number]["type"],
) {
	switch (type) {
		case "refund":
			return Icons.TrendingDown;
		case "wallet":
			return Icons.Wallet;
		case "payment_cancelled":
			return Icons.AlertTriangle;
		case "quote":
			return Icons.FileText;
		case "order":
			return Icons.ShoppingCart;
		default:
			return Icons.ReceiptText;
	}
}

function formatAddress(
	address:
		| {
				address1?: string | null;
				address2?: string | null;
				city?: string | null;
				state?: string | null;
				country?: string | null;
		  }
		| null
		| undefined,
) {
	return [
		address?.address1,
		address?.address2,
		[address?.city, address?.state].filter(Boolean).join(", "),
		address?.country,
	]
		.filter(Boolean)
		.join(", ");
}
