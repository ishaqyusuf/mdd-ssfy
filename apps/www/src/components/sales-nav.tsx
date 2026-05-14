"use client";

import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Portal from "@gnd/ui/custom/portal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { NavigationMenu } from "@gnd/ui/namespace";
import { useAuth } from "@/hooks/use-auth";
import type { PermissionScope } from "@/types/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar-links";

const reportMenuItems = [
	{
		label: "Daily Payment Report",
		href: "/task-events/sales-daily-payment-report-schedule",
		permission: "generateSalesPaymentReport",
	},
] satisfies {
	label: string;
	href: string;
	permission: PermissionScope;
}[];

export function SalesNav() {
	const pathname = usePathname();
	const auth = useAuth();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");
	const allowedReportMenuItems = reportMenuItems.filter(
		(item) => auth.can?.[item.permission],
	);
	const canEditOrders = auth.can?.editOrders;

	if (isSalesFormPath) {
		return null;
	}

	return (
		<AuthGuard rules={[_perm.in("editOrders", "generateSalesPaymentReport")]}>
			<Portal nodeId={"navRightSlot"}>
				<NavigationMenu>
					<NavigationMenu.List>
						{canEditOrders ? (
							<>
								<NavigationMenu.Item>
									<NavigationMenu.Link asChild>
										<Link
											className={cn(
												buttonVariants({
													variant: "ghost",
												}),
											)}
											href="/sales-book/orders"
										>
											Sales
										</Link>
									</NavigationMenu.Link>
								</NavigationMenu.Item>
								<NavigationMenu.Item>
									<NavigationMenu.Link asChild>
										<Link
											className={cn(
												buttonVariants({
													variant: "ghost",
												}),
											)}
											href="/sales-book/quotes"
										>
											Quotes
										</Link>
									</NavigationMenu.Link>
								</NavigationMenu.Item>
							</>
						) : null}
						{allowedReportMenuItems.length ? (
							<NavigationMenu.Item>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											className={cn(
												buttonVariants({
													variant: "ghost",
												}),
												"gap-1.5",
											)}
										>
											<Icons.FileSpreadsheet className="size-4" />
											Report
											<Icons.ChevronDown className="size-3.5" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{allowedReportMenuItems.map((item) => (
											<DropdownMenuItem key={item.href} asChild>
												<Link href={item.href}>
													<Icons.FileSpreadsheet className="mr-2 size-4" />
													{item.label}
												</Link>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</NavigationMenu.Item>
						) : null}
					</NavigationMenu.List>
				</NavigationMenu>
			</Portal>
		</AuthGuard>
	);
}
