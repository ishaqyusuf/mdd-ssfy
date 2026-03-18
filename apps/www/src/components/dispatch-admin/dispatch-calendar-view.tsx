"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { cn } from "@gnd/ui/cn";
import {
    format,
    startOfDay,
    addDays,
    isToday,
    isPast,
    isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Truck, Package, Clock } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { useState } from "react";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

type DispatchItem = {
    id: number;
    status: string | null;
    dueDate: Date | string | null;
    deliveryMode: string | null;
    driver?: { name: string } | null;
    order?: {
        orderId?: string;
        customer?: { name?: string; businessName?: string } | null;
    } | null;
};

const STATUS_COLORS: Record<string, string> = {
    queue: "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
    packed: "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
    "in progress":
        "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
    completed:
        "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
    cancelled:
        "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
    "missing items":
        "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
};

function DispatchChip({ item }: { item: DispatchItem }) {
    const ctx = useSalesOverviewQuery();
    const customer =
        item.order?.customer?.businessName ||
        item.order?.customer?.name ||
        "Unknown";
    const orderNo = item.order?.orderId ?? `#${item.id}`;
    const colorClass =
        STATUS_COLORS[item.status ?? "queue"] ?? STATUS_COLORS["queue"];
    const isOverdue =
        item.dueDate &&
        isPast(new Date(item.dueDate)) &&
        item.status !== "completed" &&
        item.status !== "cancelled";

    return (
        <button
            type="button"
            className={cn(
                "w-full text-left border rounded px-2 py-1.5 text-xs transition-opacity hover:opacity-80",
                colorClass,
                isOverdue && "ring-1 ring-red-400",
            )}
            onClick={() =>
                ctx.openDispatch(item.order?.orderId, item.id, "packing")
            }
        >
            <div className="font-medium truncate">{orderNo}</div>
            <div className="text-xs opacity-70 truncate">{customer}</div>
            {item.driver && (
                <div className="text-xs opacity-60 truncate">
                    {item.driver.name}
                </div>
            )}
        </button>
    );
}

function DayColumn({ date, items }: { date: Date; items: DispatchItem[] }) {
    const today = isToday(date);
    const past = isPast(startOfDay(date)) && !today;
    const dayName = format(date, "EEE");
    const dayNum = format(date, "d");
    const monthLabel = format(date, "MMM");

    const active = items.filter(
        (i) => i.status !== "completed" && i.status !== "cancelled",
    );
    const done = items.filter((i) => i.status === "completed");

    return (
        <div
            className={cn(
                "flex flex-col min-h-[300px] border-r last:border-r-0",
                today && "bg-blue-50/50 dark:bg-blue-950/20",
            )}
        >
            {/* Day header */}
            <div
                className={cn(
                    "sticky top-0 z-10 px-2 py-2 border-b text-center",
                    today ? "bg-blue-100 dark:bg-blue-900/50" : "bg-muted/30",
                    past && !today && "opacity-60",
                )}
            >
                <div className="text-xs text-muted-foreground">{dayName}</div>
                <div
                    className={cn(
                        "text-lg font-bold tabular-nums leading-none",
                        today && "text-blue-600 dark:text-blue-400",
                    )}
                >
                    {dayNum}
                </div>
                <div className="text-xs text-muted-foreground">
                    {monthLabel}
                </div>
                {items.length > 0 && (
                    <Badge
                        variant={today ? "default" : "secondary"}
                        className="text-xs mt-1 px-1.5"
                    >
                        {items.length}
                    </Badge>
                )}
            </div>
            {/* Dispatch chips */}
            <div className="flex flex-col gap-1 p-1.5 flex-1">
                {active.map((item) => (
                    <DispatchChip key={item.id} item={item} />
                ))}
                {done.length > 0 && (
                    <div className="mt-auto pt-1 border-t">
                        <p className="text-xs text-muted-foreground px-1 mb-1">
                            Completed ({done.length})
                        </p>
                        {done.map((item) => (
                            <DispatchChip key={item.id} item={item} />
                        ))}
                    </div>
                )}
                {items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">
                            No dispatches
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function groupByDay(
    items: DispatchItem[],
    days: Date[],
): Map<string, DispatchItem[]> {
    const map = new Map<string, DispatchItem[]>();
    for (const day of days) {
        map.set(format(day, "yyyy-MM-dd"), []);
    }
    for (const item of items) {
        if (!item.dueDate) continue;
        const key = format(new Date(item.dueDate), "yyyy-MM-dd");
        if (map.has(key)) {
            map.get(key)!.push(item);
        }
    }
    return map;
}

export function DispatchCalendarView() {
    const trpc = useTRPC();
    const { filters } = useDispatchFilterParams();
    const [weekOffset, setWeekOffset] = useState(0);

    const startDay = addDays(startOfDay(new Date()), weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDay, i));

    const { data } = useSuspenseQuery(
        trpc.dispatch.exportDispatches.queryOptions({
            tab: filters.tab,
            status: filters.status,
            q: filters.q,
            driversId: filters.driversId,
            scheduleDate: filters.scheduleDate as string[] | null,
        } as any),
    );

    const allItems: DispatchItem[] = (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        dueDate: row.dueDate,
        deliveryMode: row.deliveryMode,
        driver: row.driver ? { name: row.driver } : null,
        order: {
            orderId: row.orderNo,
            customer: { name: row.customer, businessName: row.customer },
        },
    }));
    const grouped = groupByDay(allItems, days);

    const unscheduled = allItems.filter(
        (i) =>
            !i.dueDate && i.status !== "completed" && i.status !== "cancelled",
    );

    return (
        <div className="flex flex-col gap-3">
            {/* Week nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset((w) => w - 1)}
                    >
                        <ChevronLeft size={14} />
                    </Button>
                    <span className="text-sm font-medium">
                        {format(days[0]!, "MMM d")} –{" "}
                        {format(days[6]!, "MMM d, yyyy")}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset((w) => w + 1)}
                    >
                        <ChevronRight size={14} />
                    </Button>
                    {weekOffset !== 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setWeekOffset(0)}
                            className="text-xs"
                        >
                            Today
                        </Button>
                    )}
                </div>
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-3 text-xs">
                    {Object.entries(STATUS_COLORS)
                        .slice(0, 4)
                        .map(([s, c]) => (
                            <div key={s} className="flex items-center gap-1">
                                <div
                                    className={cn(
                                        "w-2.5 h-2.5 rounded border",
                                        c,
                                    )}
                                />
                                <span className="capitalize text-muted-foreground">
                                    {s}
                                </span>
                            </div>
                        ))}
                </div>
            </div>

            {/* 7-day grid */}
            <Card className="overflow-hidden">
                <div className="grid grid-cols-7 divide-x overflow-auto">
                    {days.map((day) => (
                        <DayColumn
                            key={day.toISOString()}
                            date={day}
                            items={grouped.get(format(day, "yyyy-MM-dd")) ?? []}
                        />
                    ))}
                </div>
            </Card>

            {/* Unscheduled */}
            {unscheduled.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock
                                size={14}
                                className="text-muted-foreground"
                            />
                            Unscheduled ({unscheduled.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
                            {unscheduled.map((item) => (
                                <DispatchChip key={item.id} item={item} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function DispatchCalendarSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

