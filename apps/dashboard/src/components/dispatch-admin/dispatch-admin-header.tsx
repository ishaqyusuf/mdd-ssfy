"use client";

import { DispatchAutoRefresh } from "@/components/dispatch-admin/dispatch-auto-refresh";
import { DispatchDeletedPanel } from "@/components/dispatch-admin/dispatch-deleted-panel";
import { DispatchExportButton } from "@/components/dispatch-admin/dispatch-export-button";
import { dispatchAdminPageTabs } from "@/components/dispatch-admin/dispatch-tabs";
import type { FilterDefinition } from "@/components/midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "@/components/midday-search-filter/search-filter-trpc";
import { PageTabs } from "@/components/page-tabs";
import { SalesDispatchColumnVisibility } from "@/components/tables-2/sales-dispatch/column-visibility";
import { useDriversList } from "@/hooks/use-data-list";
import {
	dispatchSearchFilterParams,
	useDispatchFilterParams,
} from "@/hooks/use-dispatch-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { CalendarDays, MoreHorizontal, Table2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const baseDefinitions = [
	{ key: "q", label: "Search", type: "search" },
	{
		key: "stages",
		label: "Stage",
		type: "multi-select",
		options: [
			{ label: "Ready to assign", value: "ready_to_assign" },
			{ label: "Assigned", value: "assigned" },
			{ label: "Packing", value: "packing" },
			{ label: "Packing blocked", value: "packing_blocked" },
			{ label: "Ready to load", value: "ready_to_load" },
			{ label: "In transit", value: "in_transit" },
			{ label: "Fulfilled", value: "fulfilled" },
		],
	},
	{
		key: "dueBuckets",
		label: "Schedule",
		type: "multi-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Today", value: "today" },
			{ label: "Tomorrow", value: "tomorrow" },
			{ label: "Upcoming", value: "upcoming" },
			{ label: "Unscheduled", value: "unscheduled" },
		],
	},
	{
		key: "deliveryModes",
		label: "Delivery mode",
		type: "multi-select",
		options: [
			{ label: "Delivery", value: "delivery" },
			{ label: "Pickup", value: "pickup" },
		],
	},
	{
		key: "risks",
		label: "Risk",
		type: "multi-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Unscheduled", value: "unscheduled" },
			{ label: "Missing items", value: "missing_items" },
			{ label: "Unassigned", value: "unassigned" },
			{ label: "Open exception", value: "open_exception" },
		],
	},
] satisfies FilterDefinition[];

export function DispatchAdminHeader() {
	const { filters, setFilters } = useDispatchFilterParams();
	const drivers = useDriversList(true);
	const [deletedOpen, setDeletedOpen] = useState(false);
	const definitions = useMemo<FilterDefinition[]>(
		() => [
			...baseDefinitions,
			{
				key: "driversId",
				label: "Driver",
				type: "multi-select",
				options: drivers.map((driver) => ({
					label: driver.name || "Unnamed driver",
					value: String(driver.id),
				})),
			},
		],
		[drivers],
	);
	const showsTableTools = ["dashboard", "dispatches"].includes(filters.section);

	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: dispatchSearchFilterParams }]}
			>
				<SearchFilterTRPC
					placeholder="Search order, customer, address, phone, or driver..."
					filterList={definitions}
					pageTabs={
						<PageTabs
							portal={false}
							tabs={dispatchAdminPageTabs}
							maxVisible={{ base: 3, lg: 6, "2xl": 6 }}
						/>
					}
					toolbarActions={
						<>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								value={filters.section === "calendar" ? "calendar" : "table"}
								onValueChange={(value) => {
									if (value === "calendar") {
										void setFilters({ section: "calendar" });
									} else if (value === "table") {
										void setFilters({ section: "dispatches" });
									}
								}}
							>
								<ToggleGroupItem value="table" aria-label="Table view">
									<Table2 />
								</ToggleGroupItem>
								<ToggleGroupItem value="calendar" aria-label="Calendar view">
									<CalendarDays />
								</ToggleGroupItem>
							</ToggleGroup>
							{showsTableTools ? <SalesDispatchColumnVisibility /> : null}
							<DispatchAutoRefresh />
							<DispatchExportButton />
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										aria-label="More actions"
									>
										<MoreHorizontal />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuGroup>
										<DropdownMenuItem onSelect={() => setDeletedOpen(true)}>
											<Trash2 />
											Deleted dispatches
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					}
				/>
			</SearchFilterProvider>
			<DispatchDeletedPanel open={deletedOpen} onOpenChange={setDeletedOpen} />
		</div>
	);
}
