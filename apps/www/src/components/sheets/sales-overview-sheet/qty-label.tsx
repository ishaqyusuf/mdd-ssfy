import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Qty } from "@/utils/sales-control-util";

import { Badge, BadgeProps } from "@gnd/ui/badge";

interface Props {
    qty: Qty;
    done?: Qty;
    label?: "lh" | "rh" | "qty";
    className?;
    override?: boolean;
    as?: "badge";
    variant?: BadgeProps["variant"];
}
export function QtyStatus({
    qty,
    as,
    done,
    label,
    override,
    className,
    variant = "outline",
}: Props) {
    const text = useMemo(() => {
        let status = "";
        if (label == "qty" && (qty?.lh || qty?.rh) && !override) return null;
        if (!done?.[label] && !qty?.[label] && !override) return null;
        if (done && qty) {
            if (done?.[label] == qty?.[label])
                status = `${done?.[label]} completed`;
            else status = `${done?.[label]}/${qty?.[label]}`;
        }
        if (qty && !done) status = `${qty?.[label]}`;

        if (status) return `${label?.toUpperCase()}: ${status}`;
        return null;
    }, [qty, done, label]);
    if (as == "badge")
        return (
            <Badge
                variant={variant}
                className={cn("text-xs", !text && "hidden", className)}
            >
                {text}
            </Badge>
        );
    return (
        <span
            className={cn(
                "text-xs font-semibold uppercase text-muted-foreground",
                !text && "hidden",
                className,
            )}
        >
            {text}
        </span>
    );
}
