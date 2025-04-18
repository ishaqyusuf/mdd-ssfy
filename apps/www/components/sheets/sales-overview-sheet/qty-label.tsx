import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Qty } from "@/utils/sales-control-util";

interface Props {
    qty: Qty;
    done?: Qty;
    label?: "lh" | "rh" | "qty";
    className?;
    override?: boolean;
}
export function QtyStatus({ qty, done, label, override, className }: Props) {
    const text = useMemo(() => {
        let status = "";
        if (label == "qty" && (qty?.lh || qty?.rh) && !override) return null;
        if (!done?.[label] && !qty?.[label] && !override) return null;
        if (done && qty) {
            if (done?.[label] == qty?.[label])
                status = `${done?.[label]} completed`;
        }
        if (status) return `${label?.toUpperCase()}: ${status}`;
        return null;
    }, [qty, done, label]);

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
