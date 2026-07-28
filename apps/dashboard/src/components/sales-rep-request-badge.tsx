"use client";

import { useAuth } from "@/hooks/use-auth";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function SalesRepRequestBadge() {
    const trpc = useTRPC();
    const auth = useAuth();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const canReviewRequests = Boolean(auth.can?.editOrders);
    const countQuery = useQuery(
        trpc.sales.dealerOrderRequestCount.queryOptions(undefined, {
            enabled: idleQueryEnabled && canReviewRequests && !auth.isPending,
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
        }),
    );
    const count = Number(countQuery.data || 0);

    if (!count) return null;

    return (
        <Button asChild size="sm" variant="outline" className="gap-2">
            <Link href="/sales-rep?tab=requests">
                <Icons.BellRing className="size-4" />
                <span className="hidden lg:inline">
                    {count} sales {count === 1 ? "request" : "requests"}
                </span>
                <Badge className="h-5 min-w-5 justify-center rounded-sm px-1 lg:hidden">
                    {count}
                </Badge>
            </Link>
        </Button>
    );
}

export function SalesRepRequestCountBadge() {
    const trpc = useTRPC();
    const auth = useAuth();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const canReviewRequests = Boolean(auth.can?.editOrders);
    const countQuery = useQuery(
        trpc.sales.dealerOrderRequestCount.queryOptions(undefined, {
            enabled: idleQueryEnabled && canReviewRequests && !auth.isPending,
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
        }),
    );
    const count = Number(countQuery.data || 0);

    if (!count) return null;

    return (
        <Badge className="ml-2 h-5 min-w-5 justify-center rounded-sm px-1">
            {count}
        </Badge>
    );
}
