"use client";

import { useAuth } from "@/hooks/use-auth";
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import {
	SalesReportMenuContent,
	SalesReportMenuDialog,
	SalesReportMenuDropdown,
	useSalesReportMenuState,
} from "./sales-report-menu";
import { _perm } from "./sidebar-links";
import type { PermissionScope } from "@/types/auth";

const salesNavItems = [
	{
		label: "New Sales",
		href: "/sales-book/create-order",
		permission: "editOrders",
		className:
			"border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800",
		activeClassName:
			"border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-200 hover:bg-sky-600 hover:text-white",
	},
	{
		label: "New Quote",
		href: "/sales-book/create-quote",
		permission: "editOrders",
		className:
			"border-amber-200 bg-amber-50 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800",
		activeClassName:
			"border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-500 hover:text-white",
	},
] satisfies {
	label: string;
	href: string;
	permission: PermissionScope;
	className: string;
	activeClassName: string;
}[];

export function SalesNav() {
	const pathname = usePathname();
	const auth = useAuth();
	const reportMenu = useSalesReportMenuState();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");
	const allowedSalesNavItems = salesNavItems.filter(
		(item) => auth.can?.[item.permission],
	);

	if (isSalesFormPath) {
		return null;
	}

	return (
		<AuthGuard
			rules={[
				_perm.in(
					"editOrders",
					"generateSalesPaymentReport",
					"generateSalesStatementReport",
				),
			]}
		>
			<Portal nodeId={"navRightSlot"}>
				<NavigationMenu>
					<NavigationMenu.List className="gap-1.5">
						<NavigationMenu.Item className="xl:hidden">
							<SalesQuickAccessMenu
								items={allowedSalesNavItems}
								pathname={pathname}
								reportMenu={reportMenu}
							/>
						</NavigationMenu.Item>
						{allowedSalesNavItems.length ? (
							<>
								{allowedSalesNavItems.map((item) => {
									const isActive = pathname.startsWith(item.href);

									return (
										<NavigationMenu.Item key={item.href}>
											<NavigationMenu.Link asChild>
												<Link
													className={cn(
														buttonVariants({
															variant: "ghost",
														}),
														"hidden h-8 rounded-md border px-3 transition-all xl:inline-flex",
														isActive ? item.activeClassName : item.className,
													)}
													href={item.href}
													aria-current={isActive ? "page" : undefined}
												>
													<span>{item.label}</span>
												</Link>
											</NavigationMenu.Link>
										</NavigationMenu.Item>
									);
								})}
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
	pathname,
	reportMenu,
}: {
	items: typeof salesNavItems;
	pathname: string;
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
			<DropdownMenuContent align="end" className="w-56">
				{hasCreateActions ? (
					<>
						<DropdownMenuLabel>Quick access</DropdownMenuLabel>
						{items.map((item) => {
							const isActive = pathname.startsWith(item.href);

							return (
								<DropdownMenuItem key={item.href} asChild>
									<Link href={item.href} aria-current={isActive ? "page" : undefined}>
										<Icons.PlusIcon className="size-4 shrink-0" />
										<span className="flex-1">{item.label}</span>
										{isActive ? <Icons.CheckIcon className="size-3.5" /> : null}
									</Link>
								</DropdownMenuItem>
							);
						})}
					</>
				) : null}
				{hasCreateActions && reportMenu.canViewReports ? (
					<DropdownMenuSeparator />
				) : null}
				{reportMenu.canViewReports ? (
					<>
						<DropdownMenuLabel>Reports</DropdownMenuLabel>
						<SalesReportMenuContent state={reportMenu} />
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
