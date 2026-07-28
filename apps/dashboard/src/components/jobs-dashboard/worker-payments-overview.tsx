"use client";

import { Icons } from "@gnd/ui/icons";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";

const WorkerPaymentsEarningsChart = dynamic(() =>
    import("./worker-payments-earnings-chart").then(
        (mod) => mod.WorkerPaymentsEarningsChart,
    ),
);

function formatCurrency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

export function WorkerPaymentsOverview() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data: jobAnalytics } = useQuery(
        trpc.jobs.getJobAnalytics.queryOptions(
            {},
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );
    const { data: earningAnalytics } = useQuery(
        trpc.jobs.earningAnalytics.queryOptions(
            {},
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );
    const isAnalyticsPending =
        !idleQueryEnabled || !jobAnalytics || !earningAnalytics;

    const chartData = useMemo(() => {
        const values = earningAnalytics?.data || [];

        return values.slice(-7).map((value, index, list) => ({
            label: `D${values.length - list.length + index + 1}`,
            value,
        }));
    }, [earningAnalytics?.data]);

    return (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
                <PaymentCard
                    icon={Icons.Wallet}
                    label="This Month Earnings"
                    value={
                        <MetricValue
                            isPending={isAnalyticsPending}
                            value={formatCurrency(earningAnalytics?.earning)}
                        />
                    }
                />
                <PaymentCard
                    icon={Icons.BadgeDollarSign}
                    label="Paid Jobs"
                    value={
                        <MetricValue
                            isPending={isAnalyticsPending}
                            value={String(jobAnalytics?.paid || 0)}
                        />
                    }
                />
                <PaymentCard
                    icon={Icons.CalendarClock}
                    label="Awaiting Payment"
                    value={
                        <MetricValue
                            isPending={isAnalyticsPending}
                            value={String(jobAnalytics?.pendingPayments || 0)}
                        />
                    }
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Earnings Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {isAnalyticsPending ? (
                            <ChartSkeleton />
                        ) : (
                            <WorkerPaymentsEarningsChart data={chartData} />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <Button
                            asChild
                            variant="outline"
                            className="h-auto justify-between px-4 py-3 text-left"
                        >
                            <Link href="/jobs-dashboard/jobs-list">
                                <div>
                                    <p className="font-medium">
                                        Review submitted jobs
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Open your jobs list to check approval
                                        and payment status.
                                    </p>
                                </div>
                                <Icons.ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            This page tracks worker earnings and payment
                            progress from your current job activity.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function PaymentCard({
    icon: Icon,
    label,
    value,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                    {value}
                </div>
            </CardContent>
        </Card>
    );
}

function MetricValue({
    isPending,
    value,
}: {
    isPending: boolean;
    value: string;
}) {
    if (isPending) {
        return <Skeleton className="h-8 w-24" />;
    }

    return <>{value}</>;
}

function ChartSkeleton() {
    return (
        <div className="flex h-full items-end gap-3">
            {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton
                    key={index}
                    className="flex-1 rounded-t-xl"
                    style={{
                        height: `${32 + ((index * 17) % 52)}%`,
                    }}
                />
            ))}
        </div>
    );
}
