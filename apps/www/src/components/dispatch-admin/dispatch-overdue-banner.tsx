"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { AlertTriangle, Bell } from "lucide-react";
import { cn } from "@gnd/ui/cn";

export function DispatchOverdueBanner() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.dispatch.dispatchSummary.queryOptions(),
    );
    const { setFilters } = useDispatchFilterParams();

    const count = data.overdue ?? 0;
    if (count === 0) return null;

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5",
                "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
            )}
        >
            <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    <Badge variant="destructive" className="mr-2 tabular-nums">
                        {count}
                    </Badge>
                    overdue dispatch{count !== 1 ? "es" : ""} past their due
                    date
                </span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400"
                    onClick={() => setFilters({ tab: "pending", status: null })}
                >
                    View Pending
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-orange-700 dark:text-orange-400"
                    title="Overdue dispatches need attention — notify your team"
                >
                    <Bell size={13} />
                    Escalate
                </Button>
            </div>
        </div>
    );
}

