"use client";

import AuthGuard from "@/app-deps/(v2)/(loggedIn)/_components/auth-guard";

import { usePathname } from "next/navigation";
import { Menu } from "./(clean-code)/menu";
import Portal from "./_v1/portal";

export function SalesQuickAction() {
	const pathname = usePathname();
	const isSalesFormPath =
		pathname.startsWith("/sales-form/") ||
		pathname.startsWith("/sales-book/create-") ||
		pathname.startsWith("/sales-book/edit-");

	if (isSalesFormPath) {
		return null;
	}

	return (
		<Portal nodeId={"navRightSlot"}>
			<AuthGuard noRedirect can={["viewSales"]}>
				<Menu label={"Quick Action"}>
					<Menu.Item href="/sales-book/create-order">New Sales</Menu.Item>
					<Menu.Item href="/sales-book/create-quote">New Quote</Menu.Item>
				</Menu>
			</AuthGuard>
		</Portal>
	);
}
