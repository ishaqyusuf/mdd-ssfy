"use client";

import { useAuth } from "@/hooks/use-auth";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { HeaderTab } from "@gnd/ui/header-tab";
import { useQueryClient } from "@gnd/ui/tanstack";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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
];

type SalesTabsProps = {
	portal?: boolean;
	compact?: boolean;
	className?: string;
	hideWhenOrdersV2Scrolled?: boolean;
};

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

	return (
		<HeaderTab
			aria-label="Sales sections"
			portal={portal}
			className={cn(
				"transition-[height,min-height,opacity,border-color,padding] duration-200 ease-out",
				compact &&
					"h-9 min-h-9 rounded-md border bg-muted/35 px-1 py-1 shadow-none sm:px-1 [&_a]:h-7 [&_a]:gap-1.5 [&_a]:px-2 [&_a]:text-xs [&_a_span:first-child]:size-5 [&_svg]:size-3",
				hideSalesTabs &&
					"pointer-events-none h-0 min-h-0 overflow-hidden border-transparent py-0 opacity-0",
				className,
			)}
		>
			{visibleTabs.map((tab) => (
				<HeaderTab.Tab
					key={tab.href}
					href={tab.href}
					label={tab.label}
					icon={tab.icon}
				/>
			))}
		</HeaderTab>
	);
}
