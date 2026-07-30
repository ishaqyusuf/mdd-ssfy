"use client";

import { PageTabs } from "@/components/page-tabs";
import { SalesFinanceAdoptionStatus } from "@/components/sales-finance/adoption";
import { SalesFinanceReports } from "@/components/sales-finance/reports";
import { salesFinancePageTabs } from "@/components/sales-finance/tabs";
import { SalesFinanceColumnVisibility } from "@/components/tables-2/sales-finance/column-visibility";
import { salesFinanceSearchFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { Badge } from "@gnd/ui/badge";

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
			<p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
				Default period: last 30 days
			</p>
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
