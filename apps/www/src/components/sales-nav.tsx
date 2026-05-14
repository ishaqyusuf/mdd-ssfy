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

export function SalesNav() {
	const pathname = usePathname();
	const auth = useAuth();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");
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
						<NavigationMenu.Item>
							<SalesReportMenu variant="nav" />
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu>
			</Portal>
		</AuthGuard>
	);
}
