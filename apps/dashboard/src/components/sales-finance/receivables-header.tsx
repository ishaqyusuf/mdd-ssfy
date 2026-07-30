"use client";

import { PageTabs } from "@/components/page-tabs";
import { SalesFinanceAdoptionStatus } from "@/components/sales-finance/adoption";
import { SalesFinanceReceivablesReports } from "@/components/sales-finance/receivables-reports";
import { salesFinancePageTabs } from "@/components/sales-finance/tabs";
import { SalesFinanceReceivablesColumnVisibility } from "@/components/tables-2/sales-finance-receivables/column-visibility";
import { salesFinanceReceivablesSearchFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";

import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "../midday-search-filter/search-filter-trpc";

const receivablesFilterDefinitions = [
	{
		key: "q",
		label: "Search",
		type: "search",
	},
	{
		key: "dueDateRange",
		label: "Due date",
		type: "date-range",
	},
	{
		key: "agingBuckets",
		label: "Aging",
		type: "multi-select",
		options: [
			{ label: "Current", value: "current" },
			{ label: "1–30 days", value: "1_30" },
			{ label: "31–60 days", value: "31_60" },
			{ label: "61–90 days", value: "61_90" },
			{ label: "90+ days", value: "90_plus" },
		],
	},
] satisfies FilterDefinition[];

export function SalesFinanceReceivablesHeader() {
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: salesFinanceReceivablesSearchFilterParams }]}
			>
				<SearchFilterTRPC
					placeholder="Search customer, invoice, term, or sales rep..."
					filterList={receivablesFilterDefinitions}
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
							<SalesFinanceReceivablesColumnVisibility />
							<SalesFinanceReceivablesReports />
						</>
					}
				/>
			</SearchFilterProvider>
		</div>
	);
}
