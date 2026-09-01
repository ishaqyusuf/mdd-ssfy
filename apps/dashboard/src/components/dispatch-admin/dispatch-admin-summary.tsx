"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
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

export function DispatchAdminSummary({
	showOverdueAlert = false,
}: {
	showOverdueAlert?: boolean;
}) {
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
			color: "#66c8bfd9",
		},
		{
			key: "unassigned",
			label: "Ready to assign",
			value: data.byStage.readyToAssign,
			icon: UserRoundPlus,
			onClick: () => setFilters({ section: null, stages: ["ready_to_assign"] }),
			color: "#cdeb60d9",
		},
		{
			key: "ready",
			label: "Ready to load",
			value: data.byStage.readyToLoad,
			icon: PackageCheck,
			onClick: () => setFilters({ section: null, stages: ["ready_to_load"] }),
			color: "#a78bfad9",
		},
		{
			key: "transit",
			label: "In transit",
			value: data.byStage.inTransit,
			icon: Truck,
			onClick: () => setFilters({ section: null, stages: ["in_transit"] }),
			color: "#60a5fad9",
		},
		{
			key: "exceptions",
			label: "Exceptions",
			value: data.openExceptions,
			icon: AlertTriangle,
			onClick: () => setFilters({ section: "exceptions" }),
			color: "#fb923cd9",
		},
	];

	return (
		<>
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
							<Card
								className="h-full border-0 text-slate-950 shadow-none transition-transform hover:scale-[1.02]"
								style={{ backgroundColor: card.color }}
							>
								<CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
									<CardTitle className="text-xs font-medium opacity-80">
										{card.label}
									</CardTitle>
									<Icon className="size-4 opacity-70" />
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
			{showOverdueAlert && data.overdue > 0 ? (
				<Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
					<AlertTriangle className="text-amber-700 dark:text-amber-300" />
					<AlertTitle>{data.overdue} overdue dispatches</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>
							Review schedules or resolve the blockers holding these trips.
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setFilters({
									section: null,
									risks: ["overdue"],
								})
							}
						>
							Review overdue
						</Button>
					</AlertDescription>
				</Alert>
			) : null}
		</>
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
