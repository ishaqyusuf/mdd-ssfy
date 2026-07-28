import { cn } from "@gnd/ui/cn";

export function QtyLabel({ lh = null, rh = null, qty, className = "" }) {
    const lhValue = Number(lh || 0);
    const rhValue = Number(rh || 0);
    const qtyValue = Number(qty || 0);

    // Only use LH/RH label mode when there is a real handled quantity.
    if (lhValue <= 0 && rhValue <= 0) {
        return (
            <span className={cn(className)}>
                {qtyValue > 0 ? qtyValue : "-"}
            </span>
        );
    }

    const label = [lhValue, rhValue]
        .map((a, i) => (a > 0 ? (i === 0 ? `${a} LH` : `${a} RH`) : null))
        .filter(Boolean)
        .join(" & ");

    return (
        <span className={cn("whitespace-nowrap", className)}>
            {label || "-"}
        </span>
    );
}
