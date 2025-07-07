import { getBadgeColor, statusColor } from "@/lib/status-badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface Props {
    status?;
    size?;
    defaultColor?;
}
export default function FStatusBadge({
    status,
    size,
    defaultColor = "blue",
}: Props) {
    const [color, setColor] = useState(defaultColor);
    useEffect(() => {
        const _color = statusColor(status, defaultColor);
        if (_color) setColor(_color);
    }, []);

    return (
        <div className="inline-flex items-center font-medium uppercase gap-1">
            <div className={cn("w-1.5 h-1.5", `bg-${color}-500`)}></div>
            <div
                className={cn(
                    `text-${color}-500 whitespace-nowrap text-xs leading-none`
                )}
            >
                {status}
            </div>
        </div>
    );
}
