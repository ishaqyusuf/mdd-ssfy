"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@gnd/ui/skeleton";

const overviewSkeletonCards = ["completed", "review", "paid"];

const WorkerOverview = dynamic(
	() => import("./worker-overview").then((module) => module.WorkerOverview),
	{
		loading: () => <WorkerDashboardSkeleton />,
	},
);

const WorkerPaymentsOverview = dynamic(
	() =>
		import("./worker-payments-overview").then(
			(module) => module.WorkerPaymentsOverview,
		),
	{
		loading: () => <WorkerDashboardSkeleton />,
	},
);

export function LazyWorkerOverview() {
	return <WorkerOverview />;
}

export function LazyWorkerPaymentsOverview() {
	return <WorkerPaymentsOverview />;
}

function WorkerDashboardSkeleton() {
	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:grid-cols-3">
				{overviewSkeletonCards.map((key) => (
					<div
						key={key}
						className="rounded-lg border border-border bg-background p-4"
					>
						<Skeleton className="h-4 w-28" />
						<Skeleton className="mt-4 h-8 w-20" />
					</div>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
				<Skeleton className="h-72 rounded-lg" />
				<Skeleton className="h-72 rounded-lg" />
			</div>
		</div>
	);
}
