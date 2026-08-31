"use client";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	AlertTriangle,
	CheckCircle2,
	ClipboardList,
	Truck,
} from "lucide-react";
import type { DriverSummary, DriverView } from "./model";

const metricClasses =
	"w-[154px] min-w-[154px] shrink-0 flex-none border-r border-border/70 px-4 py-4 last:border-r-0 xl:w-auto xl:min-w-0 xl:flex-1";

export function DriverDashboardSummary({
	summary,
	view,
	onSelect,
}: {
	summary: DriverSummary | undefined;
	view: DriverView;
	onSelect: (view: DriverView) => void;
}) {
	const completed = summary?.byStatus.completed || 0;
	const metrics = [
		{
			label: "Assigned stops",
			value: summary?.total || 0,
			note: `${summary?.byDueBucket.today || 0} due today`,
			icon: ClipboardList,
			view: "all" as const,
		},
		{
			label: "Packed stops",
			value: summary?.byStatus.packed || 0,
			note: `${summary?.ready || 0} ready · ${summary?.packedBlocked || 0} need review`,
			icon: Truck,
			view: "packed" as const,
		},
		{
			label: "In progress",
			value: summary?.inProgress || 0,
			note: "Active route work",
			icon: Truck,
			view: "in_progress" as const,
		},
		{
			label: "Needs attention",
			value: summary?.needsAttention || 0,
			note: `${summary?.byDueBucket.overdue || 0} overdue`,
			icon: AlertTriangle,
			alert: (summary?.needsAttention || 0) > 0,
			view: "attention" as const,
		},
		{
			label: "Completed",
			value: completed,
			note: "Proof captured",
			icon: CheckCircle2,
			view: "completed" as const,
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
					<Button
						key={metric.label}
						type="button"
						variant="ghost"
						aria-pressed={view === metric.view}
						onClick={() => onSelect(metric.view)}
						className={cn(
							metricClasses,
							"h-auto snap-start items-stretch rounded-none text-left hover:bg-muted/50",
							view === metric.view &&
								"bg-muted/70 shadow-[inset_0_-2px_0_hsl(var(--primary))]",
						)}
					>
						<span className="block w-full">
							<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
								<span>{metric.label}</span>
								<Icon
									data-icon="inline-end"
									className={metric.alert ? "text-destructive" : undefined}
									aria-hidden="true"
								/>
							</div>
							<p
								className={`mt-4 font-mono text-2xl font-semibold tracking-tight ${metric.alert ? "text-destructive" : ""}`}
							>
								{metric.value}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{metric.note}
							</p>
						</span>
					</Button>
				);
			})}
		</section>
	);
}
