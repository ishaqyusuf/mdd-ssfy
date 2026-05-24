"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export function SalesCustomTab() {
	const path = usePathname();
	const trpc = useTRPC();
	const dashboardQuery = useQuery(trpc.dealerPortal.dashboard.queryOptions());
	const counts = {
		orders: dashboardQuery.data?.activeOrders,
		quotes: dashboardQuery.data?.openQuotes,
	};

	return (
		<ButtonGroup>
			{(["orders", "quotes"] as const).map((item, index) => (
				<Fragment key={item}>
					<Button
						asChild
						className={cn("gap-2", path.includes(item) && "bg-primary")}
						variant={path.includes(item) ? "default" : "outline"}
					>
						<Link href={`/${item}`}>
							<span>{index === 0 ? "Dealer Sales" : "Dealer Quotes"}</span>
							{typeof counts[item] === "number" ? (
								<Badge
									className="h-5 min-w-5 justify-center rounded-sm px-1"
									variant={path.includes(item) ? "secondary" : "outline"}
								>
									{counts[item]}
								</Badge>
							) : null}
						</Link>
					</Button>
					{index !== 0 || <Separator orientation="vertical" />}
				</Fragment>
			))}
		</ButtonGroup>
	);
}
