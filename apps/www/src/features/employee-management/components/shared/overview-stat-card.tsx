"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { LucideIcon } from "lucide-react";

export interface OverviewStatCardProps {
    label: string;
    value: string | number;
    subLabel?: string;
    icon?: LucideIcon;
    trend?: "up" | "down" | "neutral";
    className?: string;
}

export function OverviewStatCard({
    label,
    value,
    subLabel,
    icon: Icon,
    trend,
    className,
}: OverviewStatCardProps) {
    return (
        <Card className={cn("flex-1", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                {Icon && (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subLabel && (
                    <p
                        className={cn(
                            "text-xs text-muted-foreground",
                            trend === "up" && "text-green-600",
                            trend === "down" && "text-red-600",
                        )}
                    >
                        {subLabel}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
