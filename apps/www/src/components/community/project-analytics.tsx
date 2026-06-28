"use client";

import { Icons } from "@gnd/ui/icons";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";

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
                <div className="text-2xl font-semibold text-slate-950">
                    {value}
                </div>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function SummaryMetricSkeleton() {
    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-full" />
            </CardContent>
        </Card>
    );
}

export function CommunityProjectsAnalyticsCards() {
    const trpc = useTRPC();
    const { filters } = useCommunityProjectFilterParams();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.community.communityProjectsOverview.queryOptions(
            {
                builderId: filters.builderId ?? undefined,
                refNo: filters.refNo ?? undefined,
                status: filters.status ?? undefined,
            },
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );

    if (!idleQueryEnabled || isPending || !data) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <SummaryMetricSkeleton key={index.toString()} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
                title="Projects"
                value={data.summary.total}
                subtitle="Projects in the current filtered workspace"
                icon={Icons.Building2}
            />
            <SummaryMetric
                title="Active"
                value={data.summary.active}
                subtitle="Projects currently in active operations"
                icon={Icons.Home}
            />
            <SummaryMetric
                title="Archived"
                value={data.summary.archived}
                subtitle="Projects already archived from daily work"
                icon={Icons.Receipt}
            />
            <SummaryMetric
                title="Units"
                value={data.summary.units}
                subtitle="Homes attached to the filtered project set"
                icon={Icons.BriefcaseBusiness}
            />
        </div>
    );
}
