"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { AnimatedNumber } from "@/components/animated-number";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Package,
    Truck,
    XCircle,
} from "lucide-react";
import { cn } from "@gnd/ui/cn";

type SummaryCardProps = {
    count: number;
    label: string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
};

function SummaryCard({ count, label, icon, color, onClick }: SummaryCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "text-left w-full rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]",
                !onClick && "cursor-default",
            )}
            style={{ backgroundColor: color }}
        >
            <Card className="bg-transparent border-0 shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium opacity-80">
                        {label}
                    </CardTitle>
                    <span className="opacity-70">{icon}</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono">
                        <AnimatedNumber
                            value={count}
                            currency="number"
                            maximumFractionDigits={0}
                            minimumFractionDigits={0}
                        />
                    </div>
                </CardContent>
            </Card>
        </button>
    );
}

export function DispatchSummaryCardsSkeleton() {
    return (
        <>
            {Array.from({ length: 7 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16" />
                    </CardContent>
                </Card>
            ))}
        </>
    );
}

export function DispatchSummaryCards() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.dispatch.dispatchSummary.queryOptions(),
    );
    const { setFilters } = useDispatchFilterParams();

    return (
        <>
            <SummaryCard
                count={data.total}
                label="Total"
                icon={<Truck size={18} />}
                color="#66c8bfd9"
                onClick={() => setFilters({ tab: "all", status: null })}
            />
            <SummaryCard
                count={data.byStatus.queue}
                label="Queued"
                icon={<Clock size={18} />}
                color="#cdeb60d9"
                onClick={() => setFilters({ tab: null, status: "queue" })}
            />
            <SummaryCard
                count={data.byStatus.inProgress}
                label="In Progress"
                icon={<Truck size={18} />}
                color="#60a5fad9"
                onClick={() =>
                    setFilters({ tab: null, status: "in progress" })
                }
            />
            <SummaryCard
                count={data.byStatus.packed}
                label="Packed"
                icon={<Package size={18} />}
                color="#a78bfad9"
                onClick={() => setFilters({ tab: null, status: "packed" })}
            />
            <SummaryCard
                count={data.byStatus.completed}
                label="Completed"
                icon={<CheckCircle2 size={18} />}
                color="#34d399d9"
                onClick={() => setFilters({ tab: "completed", status: null })}
            />
            <SummaryCard
                count={data.byStatus.cancelled}
                label="Cancelled"
                icon={<XCircle size={18} />}
                color="#f87171d9"
                onClick={() =>
                    setFilters({ tab: null, status: "cancelled" })
                }
            />
            <SummaryCard
                count={data.overdue}
                label="Overdue"
                icon={<AlertCircle size={18} />}
                color="#fb923cd9"
            />
        </>
    );
}
