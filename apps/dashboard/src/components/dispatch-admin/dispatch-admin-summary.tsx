"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	Boxes,
	PackageCheck,
	Truck,
	UserRoundPlus,
} from "lucide-react";

export function DispatchAdminSummary() {
	const trpc = useTRPC();
	const { setFilters } = useDispatchFilterParams();
	const { data } = useSuspenseQuery(
		trpc.dispatch.workspaceSummary.queryOptions(undefined, {
			staleTime: 30_000,
		}),
	);
	const cards = [
		{
			key: "backlog",
			label: "Backlog",
			value: data.backlog,
			icon: Boxes,
			onClick: () => setFilters({ section: "backlog", stages: null }),
		},
		{
			key: "unassigned",
			label: "Ready to assign",
			value: data.byStage.readyToAssign,
			icon: UserRoundPlus,
			onClick: () =>
				setFilters({ section: "dispatches", stages: ["ready_to_assign"] }),
		},
		{
			key: "ready",
			label: "Ready to load",
			value: data.byStage.readyToLoad,
			icon: PackageCheck,
			onClick: () =>
				setFilters({ section: "dispatches", stages: ["ready_to_load"] }),
		},
		{
			key: "transit",
			label: "In transit",
			value: data.byStage.inTransit,
			icon: Truck,
			onClick: () =>
				setFilters({ section: "dispatches", stages: ["in_transit"] }),
		},
		{
			key: "exceptions",
			label: "Exceptions",
			value: data.openExceptions,
			icon: AlertTriangle,
			onClick: () => setFilters({ section: "exceptions" }),
		},
	];

	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{cards.map((card) => {
				const Icon = card.icon;
				return (
					<button
						type="button"
						key={card.key}
						className="text-left"
						onClick={card.onClick}
					>
						<Card className="h-full transition-colors hover:bg-muted/40">
							<CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
								<CardTitle className="text-xs font-medium text-muted-foreground">
									{card.label}
								</CardTitle>
								<Icon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="font-mono text-2xl font-semibold tracking-tight">
									<AnimatedNumber
										value={card.value}
										currency="number"
										minimumFractionDigits={0}
										maximumFractionDigits={0}
									/>
								</p>
							</CardContent>
						</Card>
					</button>
				);
			})}
		</section>
	);
}

export function DispatchAdminSummarySkeleton() {
	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{["backlog", "assign", "load", "transit", "exceptions"].map((key) => (
				<Card key={key}>
					<CardHeader>
						<Skeleton className="h-4 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-16" />
					</CardContent>
				</Card>
			))}
		</section>
	);
}
