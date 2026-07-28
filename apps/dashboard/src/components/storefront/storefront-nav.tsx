"use client";

import { cn } from "@gnd/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
	{ href: "/storefront/categories", label: "Categories" },
	{ href: "/storefront/catalog", label: "Catalog" },
	{ href: "/storefront/promotions", label: "Promotions" },
	{ href: "/storefront/carts", label: "Carts & Wishlists" },
	{ href: "/storefront/orders", label: "Orders" },
	{ href: "/storefront/inquiries", label: "Inquiries" },
	{ href: "/storefront/content", label: "Pages & Sections" },
	{ href: "/storefront/settings", label: "Settings" },
] as const;

export function StorefrontNav() {
	const pathname = usePathname();
	return (
		<nav
			className="flex min-h-10 gap-1 overflow-x-auto border-b"
			aria-label="Storefront workspace"
		>
			{items.map((item) => {
				const active = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
							active && "border-primary font-medium text-foreground",
						)}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
