"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function SalesRepRequestBadge() {
	const trpc = useTRPC();
	const countQuery = useQuery(trpc.sales.dealerOrderRequestCount.queryOptions());
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
