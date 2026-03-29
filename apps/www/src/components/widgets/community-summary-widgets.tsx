"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Building2, Hammer, Home, Receipt, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";

type SummaryItem = {
    title: string;
    href: string;
    icon: any;
    value: number;
    subtitle: string;
    accent: string;
    revealValue?: number;
};

function SummaryLinkCard(item: SummaryItem) {
    return (
        <Link href={item.href} className="group block h-full">
            <Card className="h-full overflow-hidden border-slate-200/80 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/10">
                <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm font-semibold text-slate-700">
                            {item.title}
                        </CardTitle>
                        <div
                            className="flex size-10 items-center justify-center rounded-2xl text-white shadow-sm"
                            style={{ background: item.accent }}
                        >
                            <item.icon className="size-4" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-3xl font-semibold tracking-tight text-slate-950">
                        <NumberFlow value={item.value} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            Snapshot
                        </p>
                        <p className="text-sm text-slate-600">{item.subtitle}</p>
                        {typeof item.revealValue === "number" ? (
                            <div className="pt-1 text-sm font-medium text-slate-900">
                                <span className="group-hover:hidden group-focus-within:hidden">
                                    Invoice amount: ••••••
                                </span>
                                <span className="hidden group-hover:inline group-focus-within:inline">
                                    Invoice amount:{" "}
                                    {formatCurrency.format(item.revealValue)}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function CommunitySummaryWidgets() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communityDashboardOverview.queryOptions({}),
    );

    const items: SummaryItem[] = [
        {
            title: "Projects",
            href: "/community/projects",
            icon: Building2,
            value: data.summary.projects,
            subtitle: `${data.summary.builders} builders active across the community`,
            accent: "linear-gradient(135deg, #0f766e, #14b8a6)",
        },
        {
            title: "Units",
            href: "/community/project-units",
            icon: Home,
            value: data.summary.units,
            subtitle: `${data.units.status[0]?.value || 0} units in the leading state`,
            accent: "linear-gradient(135deg, #1d4ed8, #38bdf8)",
        },
        {
            title: "Productions",
            href: "/community/unit-productions",
            icon: Hammer,
            value: data.summary.productions,
            subtitle: `${data.productions.status[0]?.label || "Idle"} is the top production state`,
            accent: "linear-gradient(135deg, #92400e, #f59e0b)",
        },
        {
            title: "Invoices",
            href: "/community/unit-invoices",
            icon: Receipt,
            value: data.summary.invoices,
            subtitle: `${data.invoices.status[0]?.value || 0} items are ${data.invoices.status[0]?.label?.toLowerCase() || "tracked"}`,
            accent: "linear-gradient(135deg, #7c2d12, #fb7185)",
            revealValue: data.summary.invoiceAmount,
        },
        {
            title: "Templates",
            href: "/community/templates",
            icon: Wrench,
            value: data.summary.templates,
            subtitle: `${data.summary.builders} builder setups are available`,
            accent: "linear-gradient(135deg, #4338ca, #8b5cf6)",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {items.map((item) => (
                <SummaryLinkCard key={item.title} {...item} />
            ))}
        </div>
    );
}
