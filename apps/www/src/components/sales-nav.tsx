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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar-links";

export function SalesNav() {
	const pathname = usePathname();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");

	if (isSalesFormPath) {
		return null;
	}

	return (
		<AuthGuard rules={[_perm.is("editOrders")]}>
			<Portal nodeId={"navRightSlot"}>
				<NavigationMenu>
					<NavigationMenu.List>
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
									<DropdownMenuItem asChild>
										<Link href="/task-events/sales-daily-payment-report-schedule">
											<Icons.FileSpreadsheet className="mr-2 size-4" />
											Daily Payment Report
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu>
			</Portal>
		</AuthGuard>
	);
}
