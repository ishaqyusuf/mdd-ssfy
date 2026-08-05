"use client";

import { PageTabs } from "@/components/page-tabs";
import { SalesFinanceAdoptionStatus } from "@/components/sales-finance/adoption";
import { SalesFinanceReports } from "@/components/sales-finance/reports";
import { salesFinancePageTabs } from "@/components/sales-finance/tabs";
import { SalesFinanceColumnVisibility } from "@/components/tables-2/sales-finance/column-visibility";
import { useAuth } from "@/hooks/use-auth";
import { salesFinanceSearchFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { Badge } from "@gnd/ui/badge";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "../midday-search-filter/search-filter-trpc";

const financeFilterDefinitions = [
	{
		key: "q",
		label: "Search",
		type: "search",
	},
	{
		key: "dateRange",
		label: "Payment date",
		type: "date-range",
	},
	{
		key: "paymentMethods",
		label: "Payment method",
		type: "multi-select",
		options: [
			{ label: "Card", value: "card" },
			{ label: "Check", value: "check" },
			{ label: "Zelle", value: "zelle" },
			{ label: "Cash", value: "cash" },
			{ label: "Wire", value: "wire" },
			{ label: "Unclassified", value: "unclassified" },
		],
	},
	{
		key: "statuses",
		label: "Payment status",
		type: "multi-select",
		options: [
			{ label: "Successful", value: "success" },
			{ label: "Pending", value: "pending" },
			{ label: "Failed", value: "failed" },
			{ label: "Cancelled", value: "cancelled" },
		],
	},
	{
		key: "applicationStatuses",
		label: "Application",
		type: "multi-select",
		options: [
			{ label: "Applied", value: "applied" },
			{ label: "Partially applied", value: "partial" },
			{ label: "Unapplied", value: "unapplied" },
			{ label: "Overapplied", value: "overapplied" },
		],
	},
	{
		key: "exceptionCodes",
		label: "Review reason",
		type: "multi-select",
		options: [
			{ label: "Missing customer", value: "missing_customer" },
			{ label: "Unclassified method", value: "unclassified_method" },
			{ label: "Missing reference", value: "missing_reference" },
			{ label: "Application mismatch", value: "application_mismatch" },
			{ label: "Failed payment", value: "failed_payment" },
		],
	},
] satisfies FilterDefinition[];

export function SalesFinanceTitle() {
	const auth = useAuth();
	const canOpenLegacyAccounting = Boolean(
		auth.can?.viewOrderPayment ||
			auth.can?.editOrderPayment ||
			auth.can?.editSales,
	);
	const canOpenLegacyResolution = Boolean(auth.can?.editSalesResolution);
	const canOpenSalesReports = Boolean(
		auth.can?.viewOrders || auth.can?.editOrders || auth.can?.viewSales,
	);

	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Sales Finance
					</h1>
					<Badge variant="outline" className="rounded-full text-[10px]">
						Beta
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Collections, applications, refunds, and payment exceptions in one
					workspace.
				</p>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-2">
				{canOpenSalesReports ? (
					<Link
						href="/sales-book/reports"
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"gap-2",
						)}
					>
						<Icons.salesDashboard className="size-4" aria-hidden="true" />
						Sales Reports
					</Link>
				) : null}
				{canOpenLegacyAccounting ? (
					<Link
						href="/sales-book/accounting"
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"gap-2",
						)}
					>
						<Icons.accounting className="size-4" aria-hidden="true" />
						Open legacy Accounting
					</Link>
				) : null}
				{canOpenLegacyResolution ? (
					<Link
						href="/sales-book/accounting/resolution-center"
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"gap-2",
						)}
					>
						<Icons.resolutionCenter className="size-4" aria-hidden="true" />
						Open legacy Resolution Center
					</Link>
				) : null}
				<p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
					Default period: last 30 days
				</p>
			</div>
		</div>
	);
}

export function SalesFinanceHeader() {
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: salesFinanceSearchFilterParams }]}
			>
				<SearchFilterTRPC
					placeholder="Search customer, invoice, payment, or reference..."
					filterList={financeFilterDefinitions}
					pageTabs={
						<PageTabs
							portal={false}
							tabs={salesFinancePageTabs}
							maxVisible={{ base: 4, lg: 4, "2xl": 4 }}
						/>
					}
					toolbarActions={
						<>
							<SalesFinanceAdoptionStatus />
							<SalesFinanceColumnVisibility />
							<SalesFinanceReports />
						</>
					}
				/>
			</SearchFilterProvider>
		</div>
	);
}
