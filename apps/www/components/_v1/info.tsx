"use client";

import { cn } from "@/lib/utils";
import { Label } from "@gnd/ui/label";
import { PrimitiveDivProps } from "@/types/type";

export function Info({
    label,
    children,
    hidden,
    className = "",
    value,
}: Omit<PrimitiveDivProps, "hidden"> & {
    label?: string;
    hidden?: Boolean;
    children?;
    value?;
}) {
    if (hidden) return <></>;
    return (
        <div className={cn("grid gap-1", className)}>
            <Label className="text-muted-foreground">{label}</Label>
            <div className="">{children || value || "-"}</div>
            {/* <p className="text-muted-foreground">{order.orderId}</p> */}
        </div>
    );
}
