"use client";

import { Icons } from "@gnd/ui/icons";

import { useEffect, useRef, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { cn } from "@gnd/ui/cn";

const INTERVALS = [
    { label: "Off", value: 0 },
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "1m", value: 60 },
    { label: "5m", value: 300 },
] as const;

export function DispatchAutoRefresh() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [intervalSec, setIntervalSec] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function refresh() {
        setSpinning(true);
        queryClient.invalidateQueries({
            queryKey: trpc.dispatch.index.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.dispatch.dispatchSummary.queryKey(),
        });
        setTimeout(() => setSpinning(false), 700);
    }

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (intervalSec > 0) {
            timerRef.current = setInterval(refresh, intervalSec * 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalSec]);

    const active = intervalSec > 0;
    const label =
        INTERVALS.find((i) => i.value === intervalSec)?.label ?? "Off";

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="gap-1.5"
                title="Refresh now"
            >
                <Icons.RefreshCw
                    size={14}
                    className={cn(spinning && "animate-spin")}
                />
                Refresh
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "gap-1.5 px-2",
                            active &&
                                "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400",
                        )}
                    >
                        {active ? (
                            <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0 h-4"
                            >
                                {label}
                            </Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                Auto
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Auto-refresh</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                        value={String(intervalSec)}
                        onValueChange={(v) => setIntervalSec(Number(v))}
                    >
                        {INTERVALS.map((i) => (
                            <DropdownMenuRadioItem
                                key={i.value}
                                value={String(i.value)}
                            >
                                {i.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

