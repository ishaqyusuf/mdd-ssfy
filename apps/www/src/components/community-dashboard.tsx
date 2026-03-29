"use client";

import Link from "next/link";
import { formatDate } from "@gnd/utils/dayjs";
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    Hammer,
    Home,
    Receipt,
    Settings2,
    Wrench,
} from "lucide-react";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import CommunitySummaryWidgets from "./widgets/community-summary-widgets";

function StatPill({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-slate-200 bg-white/90 shadow-sm">
            <CardHeader className="space-y-2">
                <CardTitle className="text-base text-slate-950">
                    {title}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function TrendBars({
    items,
    valueKey = "total",
    secondaryKey,
}: {
    items: Array<Record<string, any>>;
    valueKey?: string;
    secondaryKey?: string;
}) {
    const max = Math.max(
        ...items.map((item) => Number(item[valueKey] || 0)),
        1,
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-6 items-end gap-3">
                {items.map((item) => {
                    const value = Number(item[valueKey] || 0);
                    const secondary = secondaryKey
                        ? Number(item[secondaryKey] || 0)
                        : 0;
                    const height = Math.max(
                        (value / max) * 160,
                        value > 0 ? 18 : 8,
                    );
                    const secondaryHeight =
                        secondaryKey && value > 0
                            ? Math.max(
                                  (secondary / max) * 160,
                                  secondary > 0 ? 12 : 0,
                              )
                            : 0;

                    return (
                        <div
                            key={item.label}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="flex h-44 w-full items-end justify-center rounded-2xl bg-slate-50 px-2 py-3">
                                <div className="relative flex w-full max-w-[42px] items-end justify-center">
                                    <div
                                        className="w-full rounded-t-[18px] bg-gradient-to-t from-emerald-600 to-teal-300"
                                        style={{ height }}
                                    />
                                    {secondaryKey ? (
                                        <div
                                            className="absolute inset-x-2 bottom-0 rounded-t-[14px] bg-white/70"
                                            style={{ height: secondaryHeight }}
                                        />
                                    ) : null}
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-700">
                                    {value}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {item.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            {secondaryKey ? (
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Total volume
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full bg-slate-300" />
                        Overlay
                    </span>
                </div>
            ) : null}
        </div>
    );
}

function StatusPie({ items }: { items: { label: string; value: number }[] }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const palette = [
        "#0f766e",
        "#2563eb",
        "#f59e0b",
        "#fb7185",
        "#7c3aed",
        "#14b8a6",
    ];
    let offset = 0;
    const gradient = items
        .map((item, index) => {
            const start = offset;
            const end = offset + (item.value / Math.max(total, 1)) * 100;
            offset = end;
            return `${palette[index % palette.length]} ${start}% ${end}%`;
        })
        .join(", ");

    return (
        <div className="grid gap-6 lg:grid-cols-[200px,1fr] lg:items-center">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                <div
                    className="relative flex h-40 w-40 items-center justify-center rounded-full"
                    style={{
                        background:
                            total > 0
                                ? `conic-gradient(${gradient})`
                                : "conic-gradient(#e2e8f0 0% 100%)",
                    }}
                >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-center shadow-inner">
                        <div>
                            <p className="text-2xl font-semibold text-slate-950">
                                {total}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Total
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="size-3 rounded-full"
                                style={{
                                    backgroundColor:
                                        palette[index % palette.length],
                                }}
                            />
                            <span className="font-medium text-slate-700">
                                {item.label}
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-950">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RecentActivityList({
    items,
    amountLabel = false,
}: {
    items: {
        id: number;
        title: string;
        subtitle: string;
        status?: string;
        date?: string | Date | null;
        amount?: number;
    }[];
    amountLabel?: boolean;
}) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                    <div className="space-y-1">
                        <p className="font-semibold text-slate-900">
                            {item.title}
                        </p>
                        <p className="text-sm text-slate-500">
                            {item.subtitle}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {item.status ? (
                            <Badge
                                variant="secondary"
                                className="rounded-full px-3 py-1 text-xs"
                            >
                                {item.status}
                            </Badge>
                        ) : null}
                        {amountLabel && typeof item.amount === "number" ? (
                            <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency.format(item.amount)}
                            </span>
                        ) : null}
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            {item.date ? formatDate(item.date) : "No date"}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CommunityDashboard() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.community.communityDashboardOverview.queryOptions({}),
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm shadow-emerald-900/5 md:p-8">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr),minmax(340px,0.9fr)]">
                    <div className="space-y-5">
                        <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                            Community Command Center
                        </Badge>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <StatPill
                                label="Updated"
                                value={formatDate(data.generatedAt)}
                            />
                            <StatPill
                                label="Outstanding Invoice"
                                value={formatCurrency.format(
                                    data.invoices.outstanding,
                                )}
                            />
                            <StatPill
                                label="Top Production State"
                                value={
                                    data.productions.status[0]?.label || "Idle"
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <CommunitySummaryWidgets />

            <div className="rounded-[32px] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/70 to-emerald-50/50 p-4 shadow-sm md:p-6">
                <Tabs defaultValue="productions" className="space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[24px] bg-white p-2 md:grid-cols-4">
                        <TabsTrigger
                            value="productions"
                            className="gap-2 rounded-2xl py-3"
                        >
                            <Hammer className="size-4" />
                            Productions
                        </TabsTrigger>
                        <TabsTrigger
                            value="units"
                            className="gap-2 rounded-2xl py-3"
                        >
                            <Home className="size-4" />
                            Units
                        </TabsTrigger>
                        <TabsTrigger
                            value="jobs"
                            className="gap-2 rounded-2xl py-3"
                        >
                            <BriefcaseBusiness className="size-4" />
                            Jobs
                        </TabsTrigger>
                        <TabsTrigger
                            value="invoices"
                            className="gap-2 rounded-2xl py-3"
                        >
                            <Receipt className="size-4" />
                            Invoices
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="productions" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatPill
                                label="Total tasks"
                                value={data.summary.productions}
                            />
                            <StatPill
                                label="Completed"
                                value={
                                    data.productions.status.find(
                                        (item) => item.label === "Completed",
                                    )?.value || 0
                                }
                            />
                            <StatPill
                                label="Queued"
                                value={
                                    data.productions.status.find(
                                        (item) => item.label === "Queued",
                                    )?.value || 0
                                }
                            />
                        </div>
                        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
                            <SectionCard
                                title="Production progress graph"
                                description="Monthly view of production submissions with completed work overlaid inside each bar."
                            >
                                <TrendBars
                                    items={data.productions.trend}
                                    secondaryKey="completed"
                                />
                            </SectionCard>
                            <SectionCard
                                title="Pie chart by status"
                                description="Current production mix across queued, started, completed, and idle tasks."
                            >
                                <StatusPie items={data.productions.status} />
                            </SectionCard>
                        </div>
                        <SectionCard
                            title="Recent submissions"
                            description="Latest production items pushed into the workflow, with the current state attached."
                        >
                            <RecentActivityList
                                items={data.productions.recent.map((item) => ({
                                    id: item.id,
                                    title: item.title,
                                    subtitle: `${item.project} • ${item.unit}`,
                                    status: item.status,
                                    date: item.submittedAt,
                                }))}
                            />
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="units" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatPill
                                label="Total units"
                                value={data.summary.units}
                            />
                            <StatPill
                                label="With jobs"
                                value={data.summary.unitsWithJobs}
                            />
                            <StatPill
                                label="Top state"
                                value={data.units.status[0]?.label || "Idle"}
                            />
                        </div>
                        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
                            <SectionCard
                                title="Unit activity graph"
                                description="Monthly unit additions with a secondary overlay showing units that already have jobs submitted."
                            >
                                <TrendBars
                                    items={data.units.trend}
                                    secondaryKey="withJobs"
                                />
                            </SectionCard>
                            <SectionCard
                                title="Unit state mix"
                                description="Status distribution derived from production state across all community units."
                            >
                                <StatusPie items={data.units.status} />
                            </SectionCard>
                        </div>
                        <SectionCard
                            title="Recent units"
                            description="Most recent units added to the community, including project context and job submission count."
                        >
                            <RecentActivityList
                                items={data.units.recent.map((item) => ({
                                    id: item.id,
                                    title: item.title,
                                    subtitle: `${item.subtitle} • ${item.jobs} jobs submitted`,
                                    status: item.status,
                                    date: item.date,
                                }))}
                            />
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatPill
                                label="Total jobs"
                                value={data.summary.jobs}
                            />
                            <StatPill
                                label="Top status"
                                value={data.jobs.status[0]?.label || "Pending"}
                            />
                            <StatPill
                                label="Last 6 months"
                                value={data.jobs.trend.reduce(
                                    (sum, item) =>
                                        sum + Number(item.total || 0),
                                    0,
                                )}
                            />
                        </div>
                        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
                            <SectionCard
                                title="Job submission graph"
                                description="Monthly volume of community jobs to help spot intake changes and surges."
                            >
                                <TrendBars items={data.jobs.trend} />
                            </SectionCard>
                            <SectionCard
                                title="Job status distribution"
                                description="Current mix of submitted, approved, paid, rejected, and other job states."
                            >
                                <StatusPie items={data.jobs.status} />
                            </SectionCard>
                        </div>
                        <SectionCard
                            title="Recent jobs"
                            description="Latest community job submissions with status, linked project context, and amount."
                        >
                            <RecentActivityList
                                amountLabel
                                items={data.jobs.recent.map((item) => ({
                                    id: item.id,
                                    title: item.title,
                                    subtitle: item.subtitle,
                                    status: item.status,
                                    date: item.date,
                                    amount: item.amount,
                                }))}
                            />
                        </SectionCard>
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <StatPill
                                label="Invoice tasks"
                                value={data.summary.invoices}
                            />
                            <StatPill
                                label="Total due"
                                value={formatCurrency.format(
                                    data.invoices.totalAmount,
                                )}
                            />
                            <StatPill
                                label="Paid"
                                value={formatCurrency.format(
                                    data.invoices.totalPaid,
                                )}
                            />
                            <StatPill
                                label="Outstanding"
                                value={formatCurrency.format(
                                    data.invoices.outstanding,
                                )}
                            />
                        </div>
                        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
                            <SectionCard
                                title="Invoice graph"
                                description="Monthly invoice task volume with amount due tracked in the same dashboard context."
                            >
                                <TrendBars items={data.invoices.trend} />
                            </SectionCard>
                            <SectionCard
                                title="Invoice state mix"
                                description="Current spread of paid, partial, and unpaid invoice items."
                            >
                                <StatusPie items={data.invoices.status} />
                            </SectionCard>
                        </div>
                        <SectionCard
                            title="Recent invoices"
                            description="Newest invoice-related tasks, with due amounts visible here while the summary card keeps totals masked until hover."
                        >
                            <RecentActivityList
                                amountLabel
                                items={data.invoices.recent.map((item) => ({
                                    id: item.id,
                                    title: item.title,
                                    subtitle: item.subtitle,
                                    status:
                                        item.amountPaid >= item.amountDue
                                            ? "Paid"
                                            : item.amountPaid > 0
                                              ? "Partial"
                                              : "Unpaid",
                                    date: item.date,
                                    amount: item.amountDue,
                                }))}
                            />
                        </SectionCard>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

