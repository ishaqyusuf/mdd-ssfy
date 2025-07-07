"use client";

import {
    _getStatusColor,
    getBadgeColor,
    statusColor,
} from "@/lib/status-badge";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
    status?;
    children?;
    sm?: boolean;
    noDot?: boolean;
    color?;
}
export default function StatusBadge({
    status,
    color,
    children,
    sm,
    noDot,
}: Props) {
    if (!status) status = children;
    const _color = color || statusColor(status);
    return (
        <div className="inline-flex items-center gap-2 font-semibold">
            {noDot || (
                <div className={cn("w-1.5 h-1.5", `bg-${_color}-500`)}></div>
            )}
            <div className={cn(`text-${_color}-500`, "text-xs uppercase")}>
                {status}
            </div>
        </div>
    );
    return (
        <Badge
            className={cn(
                color ? _getStatusColor(color) : _color,
                "whitespace-nowrap",
                sm && "p-1 leading-none",
            )}
        >
            {status}
        </Badge>
    );
}
