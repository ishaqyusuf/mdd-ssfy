"use client";

import type { FilterDefinition } from "@/components/midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { PageTabs } from "@/components/page-tabs";
import { ContractorAccountingColumnVisibility } from "@/components/tables-2/contractor-accounting/column-visibility";
import { useAuth } from "@/hooks/use-auth";
import {
	contractorAccountingSearchFilterParams,
	useContractorAccountingFilterParams,
} from "@/hooks/use-contractor-accounting-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import { Plus } from "lucide-react";
import { ContractorAccountingOperations } from "./operations";
import { ContractorAccountingReports } from "./reports";
import { contractorAccountingPageTabs } from "./tabs";

export function ContractorAccountingTitle() {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Contractor Accounting
					</h1>
					<Badge variant="outline" className="rounded-full text-[10px]">
						Ledger-backed
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Earnings, adjustments, payouts, balances, and close controls in one
					auditable workspace.
				</p>
			</div>
		</div>
	);
}

export function ContractorAccountingHeader() {
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[
					{
						filterSchema: contractorAccountingSearchFilterParams,
					},
				]}
			>
				<ContractorAccountingSearchContent />
			</SearchFilterProvider>
		</div>
	);
}

function titleCase(value: string) {
	return value
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

function ContractorAccountingSearchContent() {
	const trpc = useTRPC();
	const auth = useAuth();
	const { shouldFetch } = useSearchFilterContext();
	const { params, setParams } = useContractorAccountingFilterParams();
	const options = useQuery({
		...trpc.contractorAccounting.filterOptions.queryOptions(),
		enabled: shouldFetch,
	});
	const definitions = [
		{ key: "q", label: "Search", type: "search" },
		{
			key: "dateRange",
			label: "Effective date",
			type: "date-range",
		},
		{
			key: "contractorIds",
			label: "Contractor",
			type: "multi-select",
			options:
				options.data?.contractors.map((contractor) => ({
					label: contractor.name,
					value: contractor.id,
				})) ?? [],
		},
		{
			key: "entryTypes",
			label: "Entry type",
			type: "multi-select",
			options:
				options.data?.entryTypes.map((entry) => ({
					label: titleCase(entry.name),
					value: entry.id,
				})) ?? [],
		},
		{
			key: "sourceTypes",
			label: "Source",
			type: "multi-select",
			options:
				options.data?.sourceTypes.map((source) => ({
					label: titleCase(source.name),
					value: source.id,
				})) ?? [],
		},
		{
			key: "amountBand",
			label: "Amount",
			type: "select",
			options: [
				{ label: "Under $500", value: "under-500" },
				{ label: "$500–$2,500", value: "500-2500" },
				{ label: "Over $2,500", value: "over-2500" },
			],
		},
		{
			key: "exceptionsOnly",
			label: "Reconciliation",
			type: "select",
			options: [{ label: "Open exceptions only", value: true }],
		},
	] satisfies FilterDefinition[];

	return (
		<div className="space-y-3">
			<PageTabs
				portal={false}
				tabs={contractorAccountingPageTabs}
				maxVisible={{ base: 5, lg: 5, "2xl": 5 }}
			/>
			<SearchFilterTRPC
				placeholder="Search contractor, source, job, payment, or description..."
				filterList={definitions}
				loading={shouldFetch && options.isFetching}
				pageTabs={null}
				toolbarActions={
					<>
						{params.tab === "ledger" ? (
							<ContractorAccountingColumnVisibility />
						) : null}
						<ContractorAccountingOperations />
						<ContractorAccountingReports />
						{auth.can?.editJobPayment ? (
							<Button
								type="button"
								size="sm"
								className="h-8 gap-2"
								onClick={() => void setParams({ createAdjustment: true })}
							>
								<Plus className="size-4" />
								<span className="hidden lg:inline">New adjustment</span>
							</Button>
						) : null}
					</>
				}
			/>
		</div>
	);
}
