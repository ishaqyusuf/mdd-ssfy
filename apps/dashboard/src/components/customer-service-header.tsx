"use client";

import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";
import { PageTabs } from "./page-tabs";
import { CustomerServiceColumnVisibility } from "./tables-2/customer-service/column-visibility";

export function CustomerServiceHeader() {
	const trpc = useTRPC();
	const isCalendar = useSearchParams().get("view") === "calendar";
	const { data: summary } = useQuery(
		trpc.customerService.getSummary.queryOptions(undefined, {
			staleTime: 60_000,
		}),
	);
	const workOrderTabs = [
		{
			title: "Pending",
			count: summary?.pending,
			params: { status: "Pending", view: null },
		},
		{
			title: "Scheduled",
			count: summary?.scheduled,
			params: { status: "Scheduled", view: null },
		},
		{
			title: "Incomplete",
			count: summary?.incomplete,
			params: { status: "Incomplete", view: null },
		},
		{
			title: "Completed",
			count: summary?.completed,
			params: { status: "Completed", view: null },
		},
		{ title: "Calendar", params: { view: "calendar", status: null } },
	];

	return (
		<div className="min-w-0 space-y-4">
			<PageTabs
				portal={false}
				tabs={workOrderTabs}
				allCount={summary?.total}
				showManage={false}
				maxVisible={{ base: 3, lg: 6, "2xl": 6 }}
			/>
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
				{!isCalendar ? (
					<div className="min-w-0 flex-1">
						<SearchFilter
							filterSchema={customerServiceFilterParams}
							placeholder="Search customer, project, phone, or issue..."
							trpcRoute={trpc.filters.customerService}
						/>
					</div>
				) : (
					<div className="min-w-0 flex-1" />
				)}
				<div className="flex shrink-0 items-center justify-end gap-2">
					{!isCalendar ? <CustomerServiceColumnVisibility /> : null}
					<OpenCustomerServiceSheet />
				</div>
			</div>
		</div>
	);
}
