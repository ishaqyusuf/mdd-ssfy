"use client";

import { SalesDispatchColumnVisibility } from "@/components/tables-2/sales-dispatch/column-visibility";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { DispatchSearchFilter } from "./dispatch-search-filter";

export function DispatchHeader() {
	const { filters, setFilters } = useDispatchFilterParams();
	const tabValue =
		filters.tab || (filters.status === "completed" ? "completed" : "pending");

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Tabs
					value={tabValue}
					onValueChange={(value) => {
						const nextTab =
							value === "all" || value === "pending" || value === "completed"
								? value
								: "pending";
						setFilters({
							tab: nextTab,
							status: nextTab === "completed" ? "completed" : null,
						});
					}}
				>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="pending">Pending</TabsTrigger>
						<TabsTrigger value="completed">Completed</TabsTrigger>
					</TabsList>
				</Tabs>
				<SalesDispatchColumnVisibility />
			</div>
			<DispatchSearchFilter />
		</div>
	);
}
