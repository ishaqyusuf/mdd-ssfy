"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { getInitials } from "@/utils/format";
import { Users } from "lucide-react";

function WorkloadBadge({ count }: { count: number }) {
    const variant =
        count >= 5 ? "destructive" : count >= 3 ? "secondary" : "outline";
    return (
        <Badge variant={variant} className="ml-auto tabular-nums">
            {count}
        </Badge>
    );
}

export function DriverWorkloadSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-3">
                <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-5 w-8 ml-auto" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export function DriverWorkloadCard() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.dispatch.dispatchSummary.queryOptions(),
    );

    const workload = data.driverWorkload;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users size={16} />
                    Driver Workload
                </CardTitle>
            </CardHeader>
            <CardContent>
                {workload.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No active driver assignments
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {workload
                            .sort((a, b) => b.activeDispatches - a.activeDispatches)
                            .map((driver) => (
                                <div
                                    key={driver.driverId}
                                    className="flex items-center gap-3"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs bg-muted">
                                            {getInitials(driver.driverName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium truncate flex-1">
                                        {driver.driverName}
                                    </span>
                                    <WorkloadBadge count={driver.activeDispatches} />
                                </div>
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
