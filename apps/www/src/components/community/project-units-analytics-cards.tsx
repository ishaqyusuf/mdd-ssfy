"use client";

import { ResponsiveMetric } from "@/components/responsive-metric";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import type { ComponentType } from "react";

function SummaryMetric({
	title,
	value,
	subtitle,
	icon: Icon,
}: {
	title: string;
	value: number;
	subtitle: string;
	icon: ComponentType<{ className?: string }>;
}) {
	return (
		<ResponsiveMetric
			title={title}
			value={value.toLocaleString()}
			subtitle={subtitle}
			icon={Icon}
		/>
	);
}

export function CommunityProjectUnitsAnalyticsCards() {
	const trpc = useTRPC();
	const { filters } = useProjectUnitFilterParams();
	const { data } = useSuspenseQuery(
		trpc.community.communityProjectUnitsOverview.queryOptions({
			builderSlug: filters.builderSlug ?? undefined,
			projectSlug: filters.projectSlug ?? undefined,
			production:
				(filters.production as
					| "idle"
					| "queued"
					| "started"
					| "completed"
					| null) ?? undefined,
			installation:
				(filters.installation as "with jobs" | "without jobs" | null) ??
				undefined,
		}),
	);

	return (
		<div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background [&>*:nth-child(-n+2)]:border-t-0 sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent xl:grid-cols-4">
			<SummaryMetric
				title="Units"
				value={data.summary.total}
				subtitle="Units in the current filtered workspace"
				icon={Icons.Home}
			/>
			<SummaryMetric
				title="Completed"
				value={data.summary.completed}
				subtitle="Units already completed in production"
				icon={Icons.Receipt}
			/>
			<SummaryMetric
				title="Active"
				value={data.summary.active}
				subtitle="Units still moving through production"
				icon={Icons.Building2}
			/>
			<SummaryMetric
				title="Jobs"
				value={data.summary.jobs}
				subtitle="Installation jobs attached to these units"
				icon={Icons.BriefcaseBusiness}
			/>
		</div>
	);
}
