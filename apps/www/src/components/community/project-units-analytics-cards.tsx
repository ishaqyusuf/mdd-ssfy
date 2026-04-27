"use client";

import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useSuspenseQuery } from "@gnd/ui/tanstack";

function SummaryMetric({
	title,
	value,
	subtitle,
	icon: Icon,
}: {
	title: string;
	value: number;
	subtitle: string;
	icon: any;
}) {
	return (
		<Card className="border-slate-200 shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-slate-700">
					{title}
				</CardTitle>
				<span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
					<Icon className="size-4" />
				</span>
			</CardHeader>
			<CardContent className="space-y-1">
				<div className="text-2xl font-semibold text-slate-950">{value}</div>
				<p className="text-xs text-slate-500">{subtitle}</p>
			</CardContent>
		</Card>
	);
}

export function CommunityProjectUnitsAnalyticsCards() {
	const trpc = useTRPC();
	const { filters } = useProjectUnitFilterParams();
	const { data } = useSuspenseQuery(
		trpc.community.communityProjectUnitsOverview.queryOptions({
			builderSlug: filters.builderSlug ?? undefined,
			projectSlug: filters.projectSlug ?? undefined,
			production: (filters.production as
				| "idle"
				| "queued"
				| "started"
				| "completed"
				| null) ?? undefined,
			installation: (filters.installation as
				| "with jobs"
				| "without jobs"
				| null) ?? undefined,
		}),
	);

	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
