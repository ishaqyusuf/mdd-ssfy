"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { PageTabs } from "./page-tabs";

function SalesBookPageTabs() {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.pageTabs.salesBook.queryOptions(undefined, {
            staleTime: 1000 * 30,
        }),
    );

    if (!data?.length) return null;
    return <PageTabs tabs={data} portal />;
}

export function DealersPageTabs() {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.pageTabs.dealers.queryOptions(undefined, {
            staleTime: 1000 * 30,
        }),
    );

    if (!data?.length) return null;
    return <PageTabs tabs={data} portal />;
}

export function SalesDashboardPageTabs() {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.pageTabs.salesDashboard.queryOptions(undefined, {
            staleTime: 1000 * 30,
        }),
    );

    if (!data?.length) return null;
    return <PageTabs tabs={data} portal />;
}
