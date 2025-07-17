"use client";

import { _getStatusColor, getColorFromName } from "@/lib/color";
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
    const _color = getColorFromName(status);
    return (
        <div className="inline-flex items-center gap-2 font-semibold">
            {noDot || (
                <div
                    style={{
                        backgroundColor: _color,
                    }}
                    className={cn("size-1.5")}
                ></div>
            )}
            <div
                style={{
                    color: _color,
                }}
                className={cn("text-xs uppercase")}
            >
                {status}
            </div>
        </div>
    );
}
