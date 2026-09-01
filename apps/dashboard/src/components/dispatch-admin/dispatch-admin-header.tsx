"use client";

import { DispatchDeletedPanel } from "@/components/dispatch-admin/dispatch-deleted-panel";
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
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
	getDeliveryFilterOptionColor,
	getStatusFilterOptionColor,
} from "@gnd/utils/filter-option-colors";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const baseDefinitions = [
	{ key: "q", label: "Search", type: "search" },
	{
		key: "stages",
		label: "Stage",
		icon: "Status",
		type: "multi-select",
		options: [
			{ label: "Ready to assign", value: "ready_to_assign" },
			{ label: "Assigned", value: "assigned" },
			{ label: "Packing", value: "packing" },
			{ label: "Packing blocked", value: "packing_blocked" },
			{ label: "Ready to load", value: "ready_to_load" },
			{ label: "In transit", value: "in_transit" },
			{ label: "Fulfilled", value: "fulfilled" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "dueBuckets",
		label: "Schedule",
		icon: "calendar",
		type: "multi-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Today", value: "today" },
			{ label: "Tomorrow", value: "tomorrow" },
			{ label: "Upcoming", value: "upcoming" },
			{ label: "Unscheduled", value: "unscheduled" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "deliveryModes",
		label: "Delivery mode",
		icon: "dispatch",
		type: "multi-select",
		options: [
			{ label: "Delivery", value: "delivery" },
			{ label: "Pickup", value: "pickup" },
		].map((option) => ({
			...option,
			color: getDeliveryFilterOptionColor(option.value),
		})),
	},
	{
		key: "risks",
		label: "Risk",
		icon: "warning",
		type: "multi-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Unscheduled", value: "unscheduled" },
			{ label: "Missing items", value: "missing_items" },
			{ label: "Unassigned", value: "unassigned" },
			{ label: "Open exception", value: "open_exception" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
] satisfies FilterDefinition[];

export function DispatchAdminHeader() {
	const trpc = useTRPC();
	const { filters, setFilters } = useDispatchFilterParams();
	const drivers = useDriversList(true);
	const summary = useQuery(
		trpc.dispatch.workspaceSummary.queryOptions(undefined, {
			staleTime: 30_000,
		}),
	);
	const [isHydrated, setIsHydrated] = useState(false);
	const [deletedOpen, setDeletedOpen] = useState(false);
	useEffect(() => setIsHydrated(true), []);
	const definitions = useMemo<FilterDefinition[]>(
		() => [
			...baseDefinitions,
			{
				key: "driversId",
				label: "Driver",
				icon: "user",
				type: "multi-select",
				options: drivers.map((driver) => ({
					label: driver.name || "Unnamed driver",
					value: String(driver.id),
				})),
			},
		],
		[drivers],
	);
	const tabs = useMemo(
		() =>
			dispatchAdminPageTabs.map((tab) => {
				const summaryData = isHydrated ? summary.data : undefined;
				const countBySection = {
					backlog: summaryData?.backlog,
					active: summaryData?.active,
					"due-today": summaryData?.dueToday,
					"past-due": summaryData?.pastDue,
					completed: summaryData?.completed,
					drivers: summaryData?.driverCount,
					exceptions: summaryData?.openExceptions,
				} as const;
				const section = tab.params?.section;
				if (section === null) return { ...tab, count: summaryData?.all };
				if (!section || !(section in countBySection)) return tab;
				return {
					...tab,
					count: countBySection[section as keyof typeof countBySection],
				};
			}),
		[isHydrated, summary.data],
	);
	const activeSection = ["dashboard", "dispatches"].includes(filters.section)
		? null
		: filters.section;
	const showsTableTools = ["dashboard", "dispatches"].includes(filters.section);

	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: dispatchSearchFilterParams }]}
			>
				<SearchFilterTRPC
					placeholder="Search order, customer, address, phone, or driver..."
					filterList={definitions}
					pageTabsLayout="adaptive"
					pageTabs={
						<PageTabs
							portal={false}
							tabs={tabs}
							showAll={false}
							activeParams={{ section: activeSection }}
							maxVisible={{ base: 3, lg: 7, "2xl": 9 }}
						/>
					}
					toolbarActions={
						<>
							{showsTableTools ? <SalesDispatchColumnVisibility /> : null}
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
