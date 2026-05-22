"use client";

import { useAuth } from "@/hooks/use-auth";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Portal from "@gnd/ui/custom/portal";
import { NavigationMenu } from "@gnd/ui/namespace";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import { SalesReportMenu } from "./sales-report-menu";
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
		<AuthGuard rules={[_perm.in("editOrders", "generateSalesPaymentReport")]}>
			<Portal nodeId={"navRightSlot"}>
				<NavigationMenu>
					<NavigationMenu.List className="gap-1.5">
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
														"h-8 rounded-md border px-3 transition-all",
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
						<NavigationMenu.Item>
							<SalesReportMenu variant="nav" />
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu>
			</Portal>
		</AuthGuard>
	);
}
