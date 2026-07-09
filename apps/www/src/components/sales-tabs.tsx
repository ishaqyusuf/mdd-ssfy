"use client";

import { useAuth } from "@/hooks/use-auth";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { type IconKeys, Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { type Access, _perm, validateRules } from "./sidebar-links";

const salesTabs: {
	href: string;
	label: string;
	icon: string;
	rules: Access[];
	primary?: boolean;
}[] = [
	{
		href: "/sales-book/orders",
		label: "Orders",
		icon: "orders",
		rules: [_perm.is("editOrders")],
		primary: true,
	},
	{
		href: "/sales-book/quotes",
		label: "Quotes",
		icon: "quotes",
		rules: [_perm.is("viewEstimates")],
		primary: true,
	},
	{
		href: "/sales-book/productions/v2",
		label: "Production",
		icon: "production",
		rules: [_perm.is("editOrders")],
	},
	{
		href: "/sales-book/shelf-items",
		label: "Shelf Items",
		icon: "products",
		rules: [_perm.is("editOrders")],
	},
	{
		href: "/sales-book/inbounds",
		label: "Inbounds",
		icon: "Warehouse",
		rules: [_perm.is("editOrders")],
	},
	{
		href: "/sales-book/emails",
		label: "Emails",
		icon: "Mail",
		rules: [_perm.in("editOrders", "viewOrders", "viewEstimates")],
	},
];

type SalesTabsProps = {
	portal?: boolean;
	compact?: boolean;
	className?: string;
	hideWhenOrdersV2Scrolled?: boolean;
};

function usePortalNode(portalNodeId: string, enabled: boolean) {
	const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);

	React.useEffect(() => {
		if (!enabled) return;

		setPortalNode(document.getElementById(portalNodeId));
	}, [enabled, portalNodeId]);

	return portalNode;
}

function getTabIcon(icon: string) {
	return Icons[icon as IconKeys];
}

export function SalesTabs({
	portal = true,
	compact = false,
	className,
	hideWhenOrdersV2Scrolled = false,
}: SalesTabsProps) {
	const auth = useAuth();
	const pathname = usePathname();
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters } = useOrderFilterParams();
	const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
	const visibleTabs = salesTabs.filter((tab) =>
		tab.primary ? true : validateRules(tab.rules, auth.can, auth.id, auth.role),
	);
	const visibleTabHrefs = visibleTabs.map((tab) => tab.href).join("|");
	const isOrdersPage =
		pathname === "/sales-book/orders" ||
		pathname.startsWith("/sales-book/orders/v2");
	const isOrdersV2TableScrolled = useSalesOrdersStore(
		(state) => state.isTableScrolled,
	);
	const hideSalesTabs =
		hideWhenOrdersV2Scrolled && isOrdersPage && isOrdersV2TableScrolled;
	const portalNode = usePortalNode("pageTab", portal);

	useEffect(() => {
		if (hideSalesTabs) return;
		if (!auth.enabled || auth.isPending) return;

		const canViewOrders = visibleTabHrefs.includes("/sales-book/orders");
		const canViewQuotes = visibleTabHrefs.includes("/sales-book/quotes");
		const infiniteOptions = {
			getNextPageParam: ({ meta }: { meta?: { cursor?: unknown } }) =>
				meta?.cursor,
		};
		const parsedFilters = JSON.parse(filterKey);

		if (canViewOrders) {
			router.prefetch("/sales-book/orders");
		}

		if (canViewQuotes) {
			router.prefetch("/sales-book/quotes");
			void queryClient.prefetchInfiniteQuery(
				trpc.sales.quotes.infiniteQueryOptions(
					parsedFilters,
					infiniteOptions,
				) as Parameters<typeof queryClient.prefetchInfiniteQuery>[0],
			);
		}
	}, [
		auth.enabled,
		auth.isPending,
		filterKey,
		hideSalesTabs,
		queryClient,
		router,
		trpc,
		visibleTabHrefs,
	]);

	if (!auth.enabled || auth.isPending) return null;

	if (!visibleTabs.length) return null;

	const content = (
		<nav
			aria-label="Sales sections"
			className={cn(
				"flex h-12 min-h-12 w-full items-center overflow-x-auto border-b bg-muted/30 px-4 py-1.5 shadow-[inset_0_1px_0_hsl(var(--background))] transition-[height,min-height,opacity,border-color,padding] duration-200 ease-out [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden",
				compact &&
					"h-9 min-h-9 rounded-md border bg-muted/35 px-1 py-1 shadow-none sm:px-1",
				hideSalesTabs &&
					"pointer-events-none h-0 min-h-0 overflow-hidden border-transparent py-0 opacity-0",
				className,
			)}
		>
			<ButtonGroup className={cn("shrink-0", !compact && "[&>*]:rounded-none")}>
				{visibleTabs.map((tab) => {
					const Icon = getTabIcon(tab.icon);
					const isActive =
						pathname === tab.href || pathname.startsWith(`${tab.href}/`);

					return (
						<Button
							asChild
							className={cn(
								"uppercase",
								compact && "h-7 gap-1.5 px-2 text-xs",
								isActive
									? "bg-foreground text-background hover:bg-foreground/90"
									: "text-muted-foreground",
							)}
							key={tab.href}
							size={compact ? "sm" : "default"}
							variant={isActive ? "default" : compact ? "outline" : "ghost"}
						>
							<Link
								aria-current={isActive ? "page" : undefined}
								href={tab.href}
							>
								{Icon ? (
									<Icon
										aria-hidden="true"
										className={cn("size-4", compact && "size-3")}
									/>
								) : null}
								<span>{tab.label}</span>
							</Link>
						</Button>
					);
				})}
			</ButtonGroup>
		</nav>
	);

	if (!portal) return content;
	if (!portalNode) return null;

	return createPortal(content, portalNode);
}
