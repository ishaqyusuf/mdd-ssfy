"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { StorefrontAdminPage } from "./storefront-admin-page";
import {
	StorefrontCartsPanel,
	StorefrontContentPanel,
	StorefrontInquiriesPanel,
	StorefrontOrdersPanel,
	StorefrontSettingsPanel,
} from "./storefront-operations-panels";

const tabs = [
	{ value: "catalog", label: "Catalog & configuration" },
	{ value: "carts", label: "Carts & wishlists" },
	{ value: "orders", label: "Online orders" },
	{ value: "inquiries", label: "Inquiries" },
	{ value: "content", label: "Pages & sections" },
	{ value: "settings", label: "Checkout settings" },
] as const;

export function StorefrontAdminWorkspace({
	initialTab,
}: {
	initialTab: string;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const tab = tabs.some((item) => item.value === initialTab)
		? initialTab
		: "catalog";
	return (
		<div className="space-y-5">
			<nav
				className="flex gap-1 overflow-x-auto rounded-md border bg-background p-1"
				aria-label="Storefront workspace"
			>
				{tabs.map((item) => {
					const params = new URLSearchParams(searchParams.toString());
					if (item.value === "catalog") params.delete("tab");
					else params.set("tab", item.value);
					return (
						<Link
							key={item.value}
							href={`${pathname}${params.size ? `?${params}` : ""}`}
							className={`whitespace-nowrap rounded px-3 py-2 text-sm ${
								tab === item.value
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted"
							}`}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>
			{tab === "catalog" && <StorefrontAdminPage />}
			{tab === "carts" && <StorefrontCartsPanel />}
			{tab === "orders" && <StorefrontOrdersPanel />}
			{tab === "inquiries" && <StorefrontInquiriesPanel />}
			{tab === "content" && <StorefrontContentPanel />}
			{tab === "settings" && <StorefrontSettingsPanel />}
		</div>
	);
}
