"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSearchStore } from "@/store/search";
import type { PermissionScope } from "@/types/auth";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Portal from "@gnd/ui/custom/portal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { NavigationMenu } from "@gnd/ui/namespace";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import {
	SalesReportMenuContent,
	SalesReportMenuDialog,
	SalesReportMenuDropdown,
	useSalesReportMenuState,
} from "./sales-report-menu";
import { _perm } from "./sidebar-links";

const salesNavItems = [
	{
		label: "New Sales",
		permission: "editOrders",
		className:
			"border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800",
	},
	{
		label: "New Quote",
		permission: "editOrders",
		className:
			"border-amber-200 bg-amber-50 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800",
	},
] satisfies {
	label: string;
	permission: PermissionScope;
	className: string;
}[];

export function SalesNav() {
	const pathname = usePathname();
	const auth = useAuth();
	const openSearch = useSearchStore((state) => state.openSearch);
	const reportMenu = useSalesReportMenuState();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");
	const allowedSalesNavItems = salesNavItems.filter(
		(item) => auth.can?.[item.permission],
	);
	const visibleSalesNavItems = isSalesFormPath ? [] : allowedSalesNavItems;

	return (
		<AuthGuard
			rules={[
				_perm.in(
					"editOrders",
					"viewOrders",
					"viewSales",
					"viewEstimates",
					"editEstimates",
					"viewOrderPayment",
					"editOrderPayment",
					"generateSalesPaymentReport",
					"generateSalesPerformanceReport",
					"generateSalesStatementReport",
				),
			]}
		>
			<Portal nodeId={"navRightSlot"}>
				<NavigationMenu>
					<NavigationMenu.List className="gap-1.5">
						<NavigationMenu.Item className="xl:hidden">
							<SalesQuickAccessMenu
								items={visibleSalesNavItems}
								onCreate={() => openSearch("sales-create")}
								reportMenu={reportMenu}
							/>
						</NavigationMenu.Item>
						{visibleSalesNavItems.length ? (
							<>
								{visibleSalesNavItems.map((item) => (
									<NavigationMenu.Item key={item.label}>
										<button
											type="button"
											className={cn(
												buttonVariants({ variant: "ghost" }),
												"hidden h-8 rounded-md border px-3 transition-all xl:inline-flex",
												item.className,
											)}
											onClick={() => openSearch("sales-create")}
										>
											<span>{item.label}</span>
										</button>
									</NavigationMenu.Item>
								))}
							</>
						) : null}
						<NavigationMenu.Item className="hidden xl:block">
							<SalesReportMenuDropdown state={reportMenu} variant="nav" />
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu>
				<SalesReportMenuDialog state={reportMenu} />
			</Portal>
		</AuthGuard>
	);
}

function SalesQuickAccessMenu({
	items,
	onCreate,
	reportMenu,
}: {
	items: typeof salesNavItems;
	onCreate: () => void;
	reportMenu: ReturnType<typeof useSalesReportMenuState>;
}) {
	const hasCreateActions = items.length > 0;

	if (!hasCreateActions && !reportMenu.canViewReports) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Quick access"
					className={cn(
						buttonVariants({
							variant: "outline",
							size: "icon-sm",
						}),
						"rounded-md",
					)}
				>
					<Icons.OptionIcon className="size-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-[min(44rem,calc(100vw-2rem))]"
			>
				{hasCreateActions ? (
					<>
						<DropdownMenuLabel>Quick access</DropdownMenuLabel>
						{items.map((item) => (
							<DropdownMenuItem key={item.label} onSelect={onCreate}>
								<Icons.PlusIcon className="size-4 shrink-0" />
								<span className="flex-1">{item.label}</span>
							</DropdownMenuItem>
						))}
					</>
				) : null}
				{hasCreateActions && reportMenu.canViewReports ? (
					<DropdownMenuSeparator />
				) : null}
				{reportMenu.canViewReports ? (
					<SalesReportMenuContent state={reportMenu} />
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
