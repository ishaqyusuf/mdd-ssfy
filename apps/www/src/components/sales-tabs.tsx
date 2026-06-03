"use client";

import { useAuth } from "@/hooks/use-auth";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useTRPC } from "@/trpc/client";
import { HeaderTab } from "@gnd/ui/header-tab";
import { useQueryClient } from "@gnd/ui/tanstack";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { _perm, validateRules, type Access } from "./sidebar-links";

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
        href: "/sales-book/productions",
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

export function SalesTabs() {
    const auth = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { filters } = useOrderFilterParams();
    const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
    const visibleTabs = salesTabs.filter((tab) =>
        tab.primary
            ? true
            : validateRules(tab.rules, auth.can, auth.id, auth.role),
    );
    const visibleTabHrefs = visibleTabs.map((tab) => tab.href).join("|");
    const hideSalesTabs = pathname.startsWith("/sales-book/orders/v2");

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
            void queryClient.prefetchInfiniteQuery(
                trpc.sales.getOrders.infiniteQueryOptions(
                    parsedFilters,
                    infiniteOptions,
                ) as any,
            );
        }

        if (canViewQuotes) {
            router.prefetch("/sales-book/quotes");
            void queryClient.prefetchInfiniteQuery(
                trpc.sales.quotes.infiniteQueryOptions(
                    parsedFilters,
                    infiniteOptions,
                ) as any,
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

    if (hideSalesTabs) return null;

    if (!auth.enabled || auth.isPending) return null;

    if (!visibleTabs.length) return null;

    return (
        <HeaderTab aria-label="Sales sections">
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
