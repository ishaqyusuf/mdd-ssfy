"use client";

import { ResponsiveMetric } from "@/components/responsive-metric";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
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

function SummaryMetricSkeleton() {
    return (
        <ResponsiveMetric
            title={<Skeleton className="h-4 w-20 rounded-full" />}
            value={<Skeleton className="h-7 w-14 rounded-md" />}
            subtitle={<Skeleton className="h-3 w-32 rounded-full" />}
        />
    );
}

export function CommunityProjectUnitsAnalyticsCards() {
    const trpc = useTRPC();
    const { filters } = useProjectUnitFilterParams();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.community.communityProjectUnitsOverview.queryOptions(
            {
                builderSlug: filters.builderSlug ?? undefined,
                projectSlug: filters.projectSlug ?? undefined,
                template: filters.template ?? undefined,
                production: filters.production ?? undefined,
                installation: filters.installation ?? undefined,
                invoice: filters.invoice ?? undefined,
                installCost: filters.installCost ?? undefined,
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
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background [&>*:nth-child(-n+2)]:border-t-0 sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <SummaryMetricSkeleton key={index.toString()} />
                ))}
            </div>
        );
    }

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
