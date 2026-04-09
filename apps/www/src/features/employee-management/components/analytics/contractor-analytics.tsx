"use client";

import { Icons } from "@gnd/ui/icons";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { ContractorAnalytics as ContractorAnalyticsType } from "../../types";
import { OverviewStatCard } from "../shared/overview-stat-card";

interface Props {
    data: ContractorAnalyticsType;
}

export function ContractorAnalytics({ data }: Props) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <OverviewStatCard
                    label="Total Jobs"
                    value={data.totalJobs}
                    icon={Icons.Briefcase}
                />
                <OverviewStatCard
                    label="Completed"
                    value={data.completedJobs}
                    icon={Icons.CheckCircle}
                />
                <OverviewStatCard
                    label="Pending"
                    value={data.pendingJobs}
                    icon={Icons.Clock}
                />
                <OverviewStatCard
                    label="Total Earnings"
                    value={data.totalEarnings}
                    icon={Icons.DollarSign}
                />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Recent Jobs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.recentJobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No recent jobs.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {data.recentJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="font-medium">
                                        {job.title}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {job.date}
                                    </span>
                                    <span className="capitalize">
                                        {job.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
