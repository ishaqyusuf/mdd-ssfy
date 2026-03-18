"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { Progress } from "@gnd/ui/custom/progress";
import { getInitials } from "@/utils/format";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Users } from "lucide-react";
import { cn } from "@gnd/ui/cn";

function WorkloadBadge({ count }: { count: number }) {
    const variant =
        count >= 5 ? "destructive" : count >= 3 ? "secondary" : "outline";
    return (
        <Badge variant={variant} className="ml-auto tabular-nums shrink-0">
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
    const { filters, setFilters } = useDispatchFilterParams();

    const workload = data.driverWorkload;
    const maxActive = Math.max(...workload.map((d) => d.activeDispatches), 1);

    function toggleDriver(driverId: number) {
        const current = filters.driversId ?? [];
        const next = current.includes(driverId)
            ? current.filter((id) => id !== driverId)
            : [...current, driverId];
        setFilters({ driversId: next.length ? next : null });
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users size={16} />
                    Driver Workload
                    {(filters.driversId?.length ?? 0) > 0 && (
                        <button
                            type="button"
                            className="ml-auto text-xs text-muted-foreground underline hover:no-underline"
                            onClick={() => setFilters({ driversId: null })}
                        >
                            Clear
                        </button>
                    )}
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
                            .sort(
                                (a, b) =>
                                    b.activeDispatches - a.activeDispatches,
                            )
                            .map((driver) => {
                                const isSelected = (
                                    filters.driversId ?? []
                                ).includes(driver.driverId);
                                const pct = Math.round(
                                    (driver.activeDispatches / maxActive) * 100,
                                );
                                return (
                                    <button
                                        type="button"
                                        key={driver.driverId}
                                        onClick={() =>
                                            toggleDriver(driver.driverId)
                                        }
                                        className={cn(
                                            "flex flex-col gap-1.5 w-full text-left rounded-md px-2 py-1.5 transition-colors",
                                            isSelected
                                                ? "bg-primary/10 ring-1 ring-primary/30"
                                                : "hover:bg-muted/50",
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className="text-xs bg-muted">
                                                    {getInitials(
                                                        driver.driverName,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate flex-1">
                                                {driver.driverName}
                                            </span>
                                            <WorkloadBadge
                                                count={driver.activeDispatches}
                                            />
                                        </div>
                                        <Progress.Progress value={pct} className="h-1" />
                                    </button>
                                );
                            })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

