"use client";

import { Icons } from "@gnd/ui/icons";

import { ContractorPayoutsHeader } from "@/components/contractor-payouts-header";
import { DataTable } from "@/components/tables/contractor-payouts/data-table";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { format } from "date-fns";
import Link from "next/link";

function formatCurrency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

export function PaymentsHistoryView() {
    const trpc = useTRPC();
    const { data, isPending } = useQuery(
        trpc.jobs.paymentDashboard.queryOptions({}),
    );

    const recentPayments = data?.recentPayments || [];

    return (
        <div className="flex flex-col gap-6">
            <section className="relative overflow-hidden rounded-3xl border bg-card">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_32%)]" />
                <div className="relative flex flex-col gap-6 p-6 md:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <Badge variant="secondary" className="mb-3">
                                Financials
                            </Badge>
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                                Payments dashboard
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground md:text-base">
                                Track processed contractor payouts, scan recent
                                payment batches, and jump into the portal
                                whenever finance is ready to build the next
                                batch.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild size="lg" variant="outline">
                                <Link href="/contractors/jobs/payment-dashboard">
                                    <Icons.ReceiptText data-icon="inline-start" />
                                    Open payment dashboard
                                </Link>
                            </Button>
                            <Button asChild size="lg">
                                <Link href="/contractors/jobs/payment-portal">
                                    <Icons.CreditCard data-icon="inline-start" />
                                    Create new payout
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="This month paid"
                            value={formatCurrency(
                                data?.summary.currentMonthAmount,
                            )}
                            icon={Icons.Wallet}
                            isPending={isPending}
                        />
                        <MetricCard
                            label="Batches this month"
                            value={String(
                                data?.summary.currentMonthPayments || 0,
                            )}
                            icon={Icons.ReceiptText}
                            isPending={isPending}
                        />
                        <MetricCard
                            label="Ready to pay jobs"
                            value={String(data?.summary.readyToPayCount || 0)}
                            icon={Icons.BadgeCheck}
                            isPending={isPending}
                        />
                        <MetricCard
                            label="Pending bill"
                            value={formatCurrency(data?.summary.pendingBill)}
                            icon={Icons.TrendingUp}
                            isPending={isPending}
                        />
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
                <Card className="rounded-3xl">
                    <CardHeader className="gap-4 border-b bg-muted/20">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <CardTitle>Payout history</CardTitle>
                                <CardDescription>
                                    Processed contractor payment batches with
                                    live search and detail drill-down.
                                </CardDescription>
                            </div>
                            <div className="w-full max-w-md">
                                <ContractorPayoutsHeader />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4 md:p-6">
                            <DataTable />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card className="rounded-3xl">
                        <CardHeader>
                            <CardTitle>Quick actions</CardTitle>
                            <CardDescription>
                                Jump straight into the active payment workflows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <QuickLink
                                href="/contractors/jobs/payment-portal"
                                title="Open payment portal"
                                description="Build a payout batch from ready-to-pay jobs."
                            />
                            <QuickLink
                                href="/contractors/jobs/payment-dashboard"
                                title="Open contractor dashboard"
                                description="See pending review counts, insurance, and contractor totals."
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    isPending,
}: {
    label: string;
    value: string;
    icon: typeof Wallet;
    isPending?: boolean;
}) {
    return (
        <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {isPending ? (
                <Skeleton className="mt-3 h-8 w-28 rounded-md" />
            ) : (
                <p className="mt-3 text-xl font-semibold text-foreground">
                    {value}
                </p>
            )}
        </div>
    );
}

function QuickLink({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl border bg-background/70 p-4 transition-colors hover:bg-muted/30"
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                <Icons.ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
        </Link>
    );
}

