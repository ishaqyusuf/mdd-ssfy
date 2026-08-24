"use client";

import {
	AlertTriangle,
	CheckCircle2,
	ClipboardList,
	Truck,
} from "lucide-react";
import type { DriverManifest } from "./model";

const metricClasses =
	"min-w-[145px] flex-1 border-r border-border/70 px-4 py-4 last:border-r-0 sm:min-w-0";

export function DriverDashboardSummary({
	summary,
}: {
	summary: DriverManifest["summary"] | undefined;
}) {
	const completed = summary?.byStatus.completed || 0;
	const attention =
		(summary?.byDueBucket.overdue || 0) +
		(summary?.byStatus["missing items"] || 0);
	const metrics = [
		{
			label: "Assigned stops",
			value: summary?.total || 0,
			note: `${summary?.byDueBucket.today || 0} due today`,
			icon: ClipboardList,
		},
		{
			label: "Ready to load",
			value: summary?.byStatus.packed || 0,
			note: "Warehouse verified",
			icon: Truck,
		},
		{
			label: "In progress",
			value: summary?.inProgress || 0,
			note: "Active route work",
			icon: Truck,
		},
		{
			label: "Needs attention",
			value: attention,
			note: `${summary?.byDueBucket.overdue || 0} overdue`,
			icon: AlertTriangle,
			alert: attention > 0,
		},
		{
			label: "Completed",
			value: completed,
			note: "Proof captured",
			icon: CheckCircle2,
		},
	];

	return (
		<section
			aria-label="Route summary"
			className="flex snap-x overflow-x-auto rounded-xl border bg-card shadow-sm xl:grid xl:grid-cols-5 xl:overflow-hidden"
		>
			{metrics.map((metric) => {
				const Icon = metric.icon;
				return (
					<article key={metric.label} className={`${metricClasses} snap-start`}>
						<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
							<span>{metric.label}</span>
							<Icon
								className={`size-4 ${metric.alert ? "text-destructive" : ""}`}
								aria-hidden="true"
							/>
						</div>
						<p
							className={`mt-4 font-mono text-2xl font-semibold tracking-tight ${metric.alert ? "text-destructive" : ""}`}
						>
							{metric.value}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
					</article>
				);
			})}
		</section>
	);
}
