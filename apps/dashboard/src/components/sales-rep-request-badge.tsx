"use client";

import { useAuth } from "@/hooks/use-auth";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type SalesRepRequestBadgeProps = {
	presentation?: "header" | "menu-item";
	onNavigate?: () => void;
};

export function SalesRepRequestBadge({
	presentation = "header",
	onNavigate,
}: SalesRepRequestBadgeProps = {}) {
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
	const isMenuItem = presentation === "menu-item";

	if (!count) return null;

	return (
		<Button
			asChild
			size="sm"
			variant={isMenuItem ? "ghost" : "outline"}
			className={
				isMenuItem
					? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium"
					: "gap-2"
			}
		>
			<Link href="/sales-rep?tab=requests" onClick={onNavigate}>
				<Icons.BellRing className="size-4" />
				<span className={isMenuItem ? "flex-1 text-left" : "hidden lg:inline"}>
					{isMenuItem
						? "Sales requests"
						: `${count} sales ${count === 1 ? "request" : "requests"}`}
				</span>
				<Badge
					className={
						isMenuItem
							? "ml-auto h-5 min-w-5 justify-center rounded-sm px-1"
							: "h-5 min-w-5 justify-center rounded-sm px-1 lg:hidden"
					}
				>
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
