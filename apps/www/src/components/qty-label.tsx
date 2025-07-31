import { cn } from "@gnd/ui/cn";

export function QtyLabel({ lh = null, rh = null, qty, className = "" }) {
    if (!lh && !rh) return <span className={cn(className)}>{qty || "-"}</span>;
    const label = [lh, rh]
        .map((a, i) => (a > 0 ? (i == 0 ? `${a} LH` : `${a} RH`) : null))
        .filter(Boolean)
        .join(" & ");
    return (
        <span className={cn("whitespace-nowrap", className)}>
            {label || "-"}
        </span>
    );
}
