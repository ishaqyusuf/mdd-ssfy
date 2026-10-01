"use client";

import { useJobsKpi } from "@/hooks/use-jobs-kpi";
import { Skeleton } from "@gnd/ui/skeleton";

export function JobsKpiWidget() {
	const {
		totalCustomJobs,
		totalJobs,
		totalJobsAmount,
		totalPendingReviews,
		isLoading,
	} = useJobsKpi();
	const metrics = [
		{
			label: "Total jobs",
			value: Number(totalJobs || 0).toLocaleString(),
			detail: "Across all contractors",
		},
		{
			label: "Custom jobs",
			value: Number(totalCustomJobs || 0).toLocaleString(),
			detail: "Work with manual pricing",
		},
		{
			label: "Pending review",
			value: Number(totalPendingReviews || 0).toLocaleString(),
			detail: "Submitted for approval",
		},
		{
			label: "Total costs",
			value: new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
			}).format(Number(totalJobsAmount || 0)),
			detail: "Hover or focus to reveal",
			masked: true,
		},
	];
	return (
		<dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
			{metrics.map((metric) => (
				<div
					key={metric.label}
					className="group flex min-w-0 flex-col gap-2 border-b p-4 odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
					tabIndex={metric.masked ? 0 : undefined}
					aria-label={
						metric.masked ? "Total costs. Focus to reveal." : undefined
					}
				>
					<dt className="text-sm text-muted-foreground">{metric.label}</dt>
					<dd className="text-2xl font-semibold tabular-nums">
						{isLoading ? (
							<Skeleton className="h-8 w-24" />
						) : metric.masked ? (
							<>
								<span className="group-hover:hidden group-focus:hidden">
									••••••
								</span>
								<span className="hidden group-hover:inline group-focus:inline">
									{metric.value}
								</span>
							</>
						) : (
							metric.value
						)}
					</dd>
					<p className="text-xs text-muted-foreground">{metric.detail}</p>
				</div>
			))}
		</dl>
	);
}
