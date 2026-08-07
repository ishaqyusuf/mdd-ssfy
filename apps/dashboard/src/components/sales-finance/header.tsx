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
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
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

	const actions = [
		canOpenSalesReports && {
			key: "sales-reports",
			label: "Sales Reports",
			href: "/sales-book/reports",
			icon: Icons.salesDashboard,
		},
		canOpenLegacyAccounting && {
			key: "legacy-accounting",
			label: "Open legacy Accounting",
			href: "/sales-book/accounting",
			icon: Icons.accounting,
		},
		canOpenLegacyResolution && {
			key: "legacy-resolution",
			label: "Open legacy Resolution Center",
			href: "/sales-book/accounting/resolution-center",
			icon: Icons.resolutionCenter,
		},
	].filter(Boolean) as Array<{
		key: string;
		label: string;
		href: string;
		icon: React.ComponentType<{
			className?: string;
			"aria-hidden"?: boolean | "true" | "false";
		}>;
	}>;

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
				{actions.length > 0 ? (
					<>
						{/* Desktop / Tablet: Button Group */}
						<div className="hidden sm:inline-flex -space-x-px rounded-md shadow-xs">
							{actions.map((action, index) => {
								const isFirst = index === 0;
								const isLast = index === actions.length - 1;
								return (
									<Link
										key={action.key}
										href={action.href}
										className={cn(
											buttonVariants({ variant: "outline", size: "sm" }),
											"gap-2 focus:z-10",
											actions.length > 1 && [
												isFirst && "rounded-r-none",
												isLast && "rounded-l-none",
												!isFirst && !isLast && "rounded-none",
											],
										)}
									>
										{action.key === "sales-reports" ? (
											<Icons.salesDashboard className="size-4" aria-hidden="true" />
										) : action.key === "legacy-accounting" ? (
											<Icons.accounting className="size-4" aria-hidden="true" />
										) : (
											<Icons.resolutionCenter className="size-4" aria-hidden="true" />
										)}
										{action.label}
									</Link>
								);
							})}
						</div>

						{/* Small screens: Dropdown Menu Fallback */}
						<div className="sm:hidden">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="gap-2">
										<span>Reports & Legacy</span>
										<Icons.ChevronDown
											className="size-3.5 opacity-60"
											aria-hidden="true"
										/>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									{actions.map((action) => {
										const Icon = action.icon;
										return (
											<DropdownMenuItem key={action.key} asChild>
												<Link
													href={action.href}
													className="flex items-center gap-2"
												>
													<Icon className="size-4" aria-hidden="true" />
													<span>{action.label}</span>
												</Link>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</>
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

export function SalesFinanceTableSearch() {
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: salesFinanceSearchFilterParams }]}
			>
				<SearchFilterTRPC
					placeholder="Search customer, invoice, payment, or reference..."
					filterList={financeFilterDefinitions}
					pageTabs={null}
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
