import PageShell from "@/components/page-shell";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Icons } from "@gnd/ui/icons";

export const dynamic = "force-dynamic";

const rep = {
    name: "Michael Hart",
    role: "Senior Sales Rep",
    email: "michaelharts@mail.com",
    initials: "MH",
    territory: "South Florida",
    quota: "$180,000",
    attainment: "82%",
};

const metrics = [
    {
        label: "Total Sales",
        value: "$147,908",
        change: "+12%",
        helper: "Relative to last month",
        tone: "positive",
        icon: Icons.dollar,
        chart: [28, 36, 32, 47, 43, 58],
    },
    {
        label: "Commission Earned",
        value: "$14,217",
        change: "+8%",
        helper: "Paid and approved",
        tone: "positive",
        icon: Icons.percent,
        chart: [18, 24, 21, 34, 29, 41],
    },
    {
        label: "Pending Commission",
        value: "$7,162",
        change: "+4%",
        helper: "Awaiting invoice close",
        tone: "positive",
        icon: Icons.pendingPayment,
        chart: [34, 32, 28, 35, 38, 44],
    },
    {
        label: "Active Customers",
        value: "126",
        change: "-3%",
        helper: "Needs follow-up",
        tone: "negative",
        icon: Icons.customers,
        chart: [52, 49, 46, 48, 43, 41],
    },
] as const;

const monthlyPerformance = [
    { month: "Jan", sales: 24, quotes: 18 },
    { month: "Feb", sales: 31, quotes: 22 },
    { month: "Mar", sales: 27, quotes: 20 },
    { month: "Apr", sales: 38, quotes: 25 },
    { month: "May", sales: 35, quotes: 26 },
    { month: "Jun", sales: 47, quotes: 31, active: true },
    { month: "Jul", sales: 32, quotes: 21 },
    { month: "Aug", sales: 29, quotes: 19 },
    { month: "Sep", sales: 41, quotes: 27 },
    { month: "Oct", sales: 36, quotes: 23 },
    { month: "Nov", sales: 30, quotes: 20 },
    { month: "Dec", sales: 44, quotes: 29 },
] as const;

const recentSales = [
    {
        id: "SO-10482",
        customer: "Evergreen Builders",
        product: "Modern Entry Package",
        status: "Approved",
        amount: "$18,420",
        commission: "$1,842",
        date: "Jun 18",
    },
    {
        id: "SO-10476",
        customer: "Harbor Custom Homes",
        product: "Impact Door Set",
        status: "Pending",
        amount: "$12,880",
        commission: "$1,030",
        date: "Jun 16",
    },
    {
        id: "SO-10451",
        customer: "Palm Ridge Estates",
        product: "Slimline Interior Doors",
        status: "Paid",
        amount: "$24,760",
        commission: "$2,476",
        date: "Jun 12",
    },
    {
        id: "QT-8810",
        customer: "Northline Development",
        product: "Builder Quote",
        status: "Quote",
        amount: "$9,620",
        commission: "$770",
        date: "Jun 10",
    },
] as const;

const pipeline = [
    { label: "New Requests", value: 18, color: "bg-orange-500" },
    { label: "Quotes Sent", value: 32, color: "bg-zinc-900 dark:bg-zinc-100" },
    { label: "Awaiting Payment", value: 11, color: "bg-amber-400" },
    { label: "Ready For Production", value: 24, color: "bg-emerald-500" },
] as const;

const topCustomers = [
    { name: "Evergreen Builders", amount: "$46,200", trend: "+18%" },
    { name: "Palm Ridge Estates", amount: "$38,940", trend: "+11%" },
    { name: "Harbor Custom Homes", amount: "$31,760", trend: "+7%" },
] as const;

export async function generateMetadata() {
    return constructMetadata({
        title: "Sales Rep Design | GND",
    });
}

// Inline target: apps/www/src/app/(sidebar)/(sales)/sales-rep/design/page.tsx
export default function SalesRepDesignPage() {
    return (
        <PageShell className="bg-[#f7f7f5] p-0 text-foreground dark:bg-background">
            <div className="min-h-[calc(100dvh-70px)] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6">
                <div className="mx-auto max-w-[1540px] overflow-hidden rounded-[18px] border border-border/70 bg-background shadow-sm">
                    <SalesRepDesignTopbar />
                    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
                        <SalesRepHero />
                        <SalesRepMetricGrid />
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
                            <SalesRepPerformancePanel />
                            <SalesRepPipelinePanel />
                        </div>
                        <SalesRepTableSection />
                    </main>
                </div>
            </div>
        </PageShell>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-design-topbar.tsx
function SalesRepDesignTopbar() {
    return (
        <div className="flex min-h-[72px] items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
                    G
                </div>
                <div className="min-w-0">
                    <PageTitle>Sales Rep Profile</PageTitle>
                    <p className="hidden truncate text-sm text-muted-foreground sm:block">
                        Performance, commissions, requests, and recent deals.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Open notifications"
                    className="rounded-lg"
                >
                    <Icons.notification className="size-4" />
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="hidden rounded-lg sm:inline-flex"
                >
                    <Icons.Filter className="size-4" />
                    Filter
                </Button>
                <Button
                    size="sm"
                    className="rounded-lg bg-zinc-950 text-white hover:bg-zinc-800"
                >
                    <Icons.add className="size-4" />
                    Create Sale
                </Button>
            </div>
        </div>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-hero.tsx
function SalesRepHero() {
    return (
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <RepAvatar className="size-12 text-base" />
                    <div>
                        <h2 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                            Welcome back, {rep.name.split(" ")[0]}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {rep.role} · {rep.territory} · {rep.email}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <HeroPill label="Quota" value={rep.quota} />
                <HeroPill label="Attainment" value={rep.attainment} />
                <HeroPill label="Open requests" value="18" />
            </div>
        </section>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-hero-pill.tsx
function HeroPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border/70 bg-card px-4 py-2 shadow-xs">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
                {label}
            </p>
            <p className="text-sm font-semibold">{value}</p>
        </div>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-metric-grid.tsx
function SalesRepMetricGrid() {
    return (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
                <SalesRepMetricCard key={metric.label} metric={metric} />
            ))}
        </section>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-metric-card.tsx
function SalesRepMetricCard({ metric }: { metric: (typeof metrics)[number] }) {
    const Icon = metric.icon;

    return (
        <Card className="overflow-hidden rounded-xl border-border/70 bg-card shadow-none">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-sm text-muted-foreground">
                                {metric.label}
                            </p>
                            <Icons.Info className="size-3.5 text-muted-foreground/70" />
                        </div>
                        <p className="mt-3 text-3xl font-semibold tracking-normal">
                            {metric.value}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {metric.helper}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <span
                            className={cn(
                                "rounded-md px-2 py-1 text-xs font-medium",
                                metric.tone === "positive"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                            )}
                        >
                            {metric.change}
                        </span>
                        <span className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300">
                            <Icon className="size-4" />
                        </span>
                    </div>
                </div>
                <MiniBars values={metric.chart} tone={metric.tone} />
            </CardContent>
        </Card>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-performance-panel.tsx
function SalesRepPerformancePanel() {
    const max = Math.max(
        ...monthlyPerformance.flatMap((item) => [item.sales, item.quotes]),
    );

    return (
        <Card className="rounded-xl border-border/70 shadow-none">
            <CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
                            <Icons.salesDashboard className="size-5" />
                        </span>
                        <div>
                            <CardTitle className="text-base font-medium text-muted-foreground">
                                Sales Performance
                            </CardTitle>
                            <p className="text-3xl font-semibold tracking-normal">
                                $147,908
                                <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 align-middle text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    +12%
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <LegendDot
                            color="bg-orange-500"
                            label="Orders"
                            value="$104,321"
                        />
                        <LegendDot
                            color="bg-orange-100"
                            label="Quotes"
                            value="$42,241"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {["1D", "1W", "1M", "6M", "1Y"].map((range) => (
                        <button
                            className={cn(
                                "h-9 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted",
                                range === "1M" &&
                                    "border bg-background font-medium text-foreground shadow-xs",
                            )}
                            key={range}
                            type="button"
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-5 sm:px-5">
                <div className="relative h-[320px] rounded-lg">
                    <div className="absolute left-0 top-1 z-10 rounded-lg bg-zinc-950 px-4 py-3 text-white shadow-lg">
                        <p className="text-sm text-zinc-400">June, 2026</p>
                        <div className="mt-2 space-y-1 text-sm">
                            <p>
                                <span className="mr-2 inline-block size-2 rounded-full bg-orange-500" />
                                Orders{" "}
                                <span className="ml-6 font-medium">
                                    $18,266
                                </span>
                            </p>
                            <p>
                                <span className="mr-2 inline-block size-2 rounded-full bg-orange-100" />
                                Quotes{" "}
                                <span className="ml-7 font-medium">$9,356</span>
                            </p>
                        </div>
                    </div>

                    <div className="grid h-full grid-cols-12 items-end gap-3 pt-16">
                        {monthlyPerformance.map((item) => (
                            <div
                                className="flex min-w-0 flex-col items-center gap-3"
                                key={item.month}
                            >
                                <div className="flex h-56 w-full max-w-16 items-end justify-center gap-1.5">
                                    <div
                                        className={cn(
                                            "w-5 rounded-t-lg",
                                            item.active
                                                ? "bg-orange-500"
                                                : "bg-[repeating-linear-gradient(135deg,#f3f3f1_0,#f3f3f1_8px,#e8e8e5_8px,#e8e8e5_10px)] dark:bg-muted",
                                        )}
                                        style={{
                                            height: `${(item.sales / max) * 100}%`,
                                        }}
                                    />
                                    <div
                                        className={cn(
                                            "w-5 rounded-t-lg",
                                            item.active
                                                ? "bg-orange-100 dark:bg-orange-950"
                                                : "bg-[repeating-linear-gradient(135deg,#fafafa_0,#fafafa_8px,#ececea_8px,#ececea_10px)] dark:bg-muted/60",
                                        )}
                                        style={{
                                            height: `${(item.quotes / max) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span
                                    className={cn(
                                        "text-sm text-muted-foreground",
                                        item.active &&
                                            "font-medium text-foreground",
                                    )}
                                >
                                    {item.month}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-pipeline-panel.tsx
function SalesRepPipelinePanel() {
    const total = pipeline.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="rounded-xl border-border/70 shadow-none">
            <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-xl font-semibold tracking-normal">
                            Pipeline
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Current rep-owned activity
                        </p>
                    </div>
                    <Badge variant="outline" className="rounded-md">
                        {total} active
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 pt-0 sm:p-5 sm:pt-0">
                <div className="relative mx-auto flex aspect-square max-w-[240px] items-center justify-center rounded-full border-[22px] border-orange-100 dark:border-orange-950">
                    <div className="absolute inset-[-22px] rounded-full border-[22px] border-r-orange-500 border-t-orange-500 border-b-transparent border-l-transparent" />
                    <div className="relative text-center">
                        <p className="text-4xl font-semibold tracking-normal">
                            {rep.attainment}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            quota progress
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {pipeline.map((item) => (
                        <div className="space-y-1.5" key={item.label}>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <span
                                        className={cn(
                                            "size-2 rounded-full",
                                            item.color,
                                        )}
                                    />
                                    {item.label}
                                </span>
                                <span className="font-medium">
                                    {item.value}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        item.color,
                                    )}
                                    style={{
                                        width: `${(item.value / total) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium">Top customers</p>
                    <div className="mt-3 space-y-3">
                        {topCustomers.map((customer) => (
                            <div
                                className="flex items-center justify-between gap-3"
                                key={customer.name}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {customer.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {customer.trend} this month
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold">
                                    {customer.amount}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-table-section.tsx
function SalesRepTableSection() {
    return (
        <Card className="rounded-xl border-border/70 shadow-none">
            <CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                    <CardTitle className="text-xl font-semibold tracking-normal">
                        Recent Activity
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Sales, quotes, and commission movement for this rep.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg">
                        <Icons.chart className="size-4" />
                        Table View
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg">
                        <Icons.Filter className="size-4" />
                        Filter
                    </Button>
                    <Button
                        size="sm"
                        className="rounded-lg bg-zinc-950 text-white hover:bg-zinc-800"
                    >
                        <Icons.Export className="size-4" />
                        Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-y bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                                <th className="px-5 py-3 font-medium">Order</th>
                                <th className="px-5 py-3 font-medium">
                                    Customer
                                </th>
                                <th className="px-5 py-3 font-medium">
                                    Product
                                </th>
                                <th className="px-5 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Amount
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Commission
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map((sale) => (
                                <tr
                                    className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                                    key={sale.id}
                                >
                                    <td className="px-5 py-4 font-medium">
                                        {sale.id}
                                    </td>
                                    <td className="px-5 py-4">
                                        {sale.customer}
                                    </td>
                                    <td className="px-5 py-4 text-muted-foreground">
                                        {sale.product}
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={sale.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right font-medium">
                                        {sale.amount}
                                    </td>
                                    <td className="px-5 py-4 text-right text-muted-foreground">
                                        {sale.commission}
                                    </td>
                                    <td className="px-5 py-4 text-right text-muted-foreground">
                                        {sale.date}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// Inline target: apps/www/src/components/sales-rep/status-badge.tsx
function StatusBadge({
    status,
}: {
    status: (typeof recentSales)[number]["status"];
}) {
    const variants = {
        Approved:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        Pending:
            "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        Paid: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        Quote: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    };

    return (
        <span
            className={cn(
                "inline-flex rounded-md px-2 py-1 text-xs font-medium",
                variants[status],
            )}
        >
            {status}
        </span>
    );
}

// Inline target: apps/www/src/components/sales-rep/rep-avatar.tsx
function RepAvatar({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "flex shrink-0 items-center justify-center rounded-xl bg-zinc-950 font-semibold text-white",
                className,
            )}
        >
            {rep.initials}
        </span>
    );
}

// Inline target: apps/www/src/components/sales-rep/legend-dot.tsx
function LegendDot({
    color,
    label,
    value,
}: {
    color: string;
    label: string;
    value: string;
}) {
    return (
        <span className="inline-flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", color)} />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </span>
    );
}

// Inline target: apps/www/src/components/sales-rep/mini-bars.tsx
function MiniBars({
    values,
    tone,
}: {
    values: readonly number[];
    tone: "positive" | "negative";
}) {
    const max = Math.max(...values);

    return (
        <div className="mt-5 flex h-12 items-end gap-1.5">
            {values.map((value, index) => (
                <span
                    className={cn(
                        "w-4 rounded-t-md",
                        tone === "positive"
                            ? "bg-orange-500/20 last:bg-orange-500"
                            : "bg-rose-500/15 last:bg-rose-500",
                    )}
                    key={`${value}-${index}`}
                    style={{ height: `${(value / max) * 100}%` }}
                />
            ))}
        </div>
    );
}
