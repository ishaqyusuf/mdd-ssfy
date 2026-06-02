"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { MaskedRevealValue } from "@/components/masked-reveal-value";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import type { Icon } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";

type SalesOrdersV2SummaryData = RouterOutputs["sales"]["getOrdersV2Summary"];

type Props = {
    data: SalesOrdersV2SummaryData;
    title: string;
    subtitle: string;
    icon: Icon;
    value: number | string | null | undefined;
    money?: boolean;
    masked?: boolean;
};

export function SalesOrdersV2SummarySkeleton() {
    return (
        <Card className="rounded-3xl">
            <CardHeader className="px-4 pb-2 pt-4">
                <Skeleton className="h-4 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
            </CardContent>
        </Card>
    );
}

export function SalesOrdersV2Summary({
    data,
    title,
    subtitle,
    icon: Icon,
    value,
    money = false,
    masked = false,
}: Props) {
    if (!data) {
        return null;
    }

    const formattedValue = money
        ? formatCurrency.format(Number(value || 0))
        : value;

    return (
        <Card className="rounded-3xl border-slate-200 bg-white/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-slate-700">
                        {title}
                    </CardTitle>
                </div>
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                    <Icon className="size-4" />
                </div>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4 pb-4 pt-0">
                {money && masked ? (
                    <MaskedRevealValue
                        value={String(formattedValue)}
                        className="text-3xl font-semibold tracking-tight text-slate-950"
                    />
                ) : (
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">
                        {formattedValue}
                    </p>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                    {subtitle}
                </p>
            </CardContent>
        </Card>
    );
}
