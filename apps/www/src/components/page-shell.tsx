"use client";

import { cn } from "@gnd/ui/cn";

export default function PageShell({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-4 px-6", className)}>
            {children}
        </div>
    );
}

