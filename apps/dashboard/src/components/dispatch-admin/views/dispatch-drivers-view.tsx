"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@gnd/ui/empty";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Truck, UsersRound } from "lucide-react";

export function DispatchDriversView() {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(
		trpc.dispatch.driverWorkload.queryOptions(undefined, {
			staleTime: 30_000,
		}),
	);
	if (!data.length) {
		return (
			<Empty className="min-h-[420px] border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<UsersRound />
					</EmptyMedia>
					<EmptyTitle>No active driver workload</EmptyTitle>
					<EmptyDescription>
						Assigned trips appear here as dispatches become active.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}
	return (
		<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{data.map((driver) => (
				<Card key={driver.driverId}>
					<CardHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<CardTitle>{driver.driverName}</CardTitle>
								<CardDescription>{driver.active} active stops</CardDescription>
							</div>
							<Truck className="size-5 text-muted-foreground" />
						</div>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Badge variant="outline">{driver.readyToLoad} ready</Badge>
						<Badge variant="outline">{driver.inTransit} in transit</Badge>
						{driver.openExceptions ? (
							<Badge variant="destructive">
								{driver.openExceptions} exceptions
							</Badge>
						) : null}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
