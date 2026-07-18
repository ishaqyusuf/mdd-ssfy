import PageShell from "@/components/page-shell";
import { SalesRepMiniChart } from "@/components/sales-rep/sales-rep-mini-chart";
import { SalesRepPerformanceChart } from "@/components/sales-rep/sales-rep-performance-chart";
import { DataTable as SalesRepDesignActivityDataTable } from "@/components/tables-2/sales-rep-design-activity/data-table";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { getInitialTableSettings } from "@/utils/columns";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Icons } from "@gnd/ui/icons";
import { Progress } from "@gnd/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";

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
	{ label: "New Requests", value: 18, color: "bg-chart-1" },
	{ label: "Quotes Sent", value: 32, color: "bg-chart-2" },
	{ label: "Awaiting Payment", value: 11, color: "bg-chart-3" },
	{ label: "Ready For Production", value: 24, color: "bg-chart-4" },
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
export default async function SalesRepDesignPage() {
	const activityInitialSettings = await getInitialTableSettings(
		"sales-rep-design-activity",
	);

	return (
		<PageShell className="bg-muted/40 p-0 text-foreground">
			<div className="min-h-[calc(100dvh-70px)] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6">
				<div className="mx-auto max-w-[1540px] overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
					<SalesRepDesignTopbar />
					<main className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
						<SalesRepHero />
						<SalesRepMetricGrid />
						<div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
							<SalesRepPerformancePanel />
							<SalesRepPipelinePanel />
						</div>
						<SalesRepTableSection initialSettings={activityInitialSettings} />
					</main>
				</div>
			</div>
		</PageShell>
	);
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-design-topbar.tsx
function SalesRepDesignTopbar() {
	return (
		<div className="flex min-h-[72px] items-center justify-between gap-4 border-b border-border px-4 sm:px-6 lg:px-8">
			<div className="flex min-w-0 items-center gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
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
					<Icons.notification data-icon="inline-start" />
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="hidden rounded-lg sm:inline-flex"
				>
					<Icons.Filter data-icon="inline-start" />
					Filter
				</Button>
				<Button size="sm" className="rounded-lg">
					<Icons.add data-icon="inline-start" />
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
		<div className="rounded-lg border border-border bg-card px-4 py-2 shadow-xs">
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
		<Card className="overflow-hidden rounded-xl border-border bg-card shadow-none">
			<CardHeader className="p-4 pb-0">
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
						<Badge
							variant={metric.tone === "positive" ? "default" : "destructive"}
							className="rounded-md"
						>
							{metric.change}
						</Badge>
						<span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Icon />
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				{/* Inline target: apps/www/src/components/sales-rep/sales-rep-mini-chart.tsx */}
				<SalesRepMiniChart values={metric.chart} tone={metric.tone} />
			</CardContent>
		</Card>
	);
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-performance-panel.tsx
function SalesRepPerformancePanel() {
	return (
		<Card className="rounded-xl border-border shadow-none">
			<CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
				<div>
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary">
							<Icons.salesDashboard className="size-5" />
						</span>
						<div>
							<CardTitle className="text-base font-medium text-muted-foreground">
								Sales Performance
							</CardTitle>
							<p className="text-3xl font-semibold tracking-normal">
								$147,908
								<Badge className="ml-2 rounded-md align-middle">+12%</Badge>
							</p>
						</div>
					</div>
					<div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
						<span>
							Orders{" "}
							<span className="font-medium text-foreground">$104,321</span>
						</span>
						<span>
							Quotes{" "}
							<span className="font-medium text-foreground">$42,241</span>
						</span>
					</div>
				</div>

				<ToggleGroup
					type="single"
					defaultValue="1M"
					variant="outline"
					size="sm"
					className="rounded-lg border border-border"
				>
					{["1D", "1W", "1M", "6M", "1Y"].map((range) => (
						<ToggleGroupItem
							aria-label={`Show ${range} performance`}
							key={range}
							value={range}
						>
							{range}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</CardHeader>

			<CardContent className="px-4 pb-5 sm:px-5">
				{/* Inline target: apps/www/src/components/sales-rep/sales-rep-performance-chart.tsx */}
				<SalesRepPerformanceChart data={monthlyPerformance} />
			</CardContent>
		</Card>
	);
}

// Inline target: apps/www/src/components/sales-rep/sales-rep-pipeline-panel.tsx
function SalesRepPipelinePanel() {
	const total = pipeline.reduce((sum, item) => sum + item.value, 0);

	return (
		<Card className="rounded-xl border-border shadow-none">
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
			<CardContent className="flex flex-col gap-5 p-4 pt-0 sm:p-5 sm:pt-0">
				<div className="relative mx-auto flex aspect-square max-w-[240px] items-center justify-center rounded-full border-[22px] border-muted">
					<div className="absolute inset-[-22px] rounded-full border-[22px] border-r-primary border-t-primary border-b-transparent border-l-transparent" />
					<div className="relative text-center">
						<p className="text-4xl font-semibold tracking-normal">
							{rep.attainment}
						</p>
						<p className="text-sm text-muted-foreground">quota progress</p>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					{pipeline.map((item) => (
						<div className="flex flex-col gap-1.5" key={item.label}>
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2 text-muted-foreground">
									<span className={cn("size-2 rounded-full", item.color)} />
									{item.label}
								</span>
								<span className="font-medium">{item.value}</span>
							</div>
							<Progress value={(item.value / total) * 100} className="h-2" />
						</div>
					))}
				</div>

				<div className="rounded-xl border border-border bg-muted/30 p-4">
					<p className="text-sm font-medium">Top customers</p>
					<div className="mt-3 flex flex-col gap-3">
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
function SalesRepTableSection({
	initialSettings,
}: {
	initialSettings: Awaited<ReturnType<typeof getInitialTableSettings>>;
}) {
	return (
		<Card className="rounded-xl border-border shadow-none">
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
						<Icons.chart data-icon="inline-start" />
						Table View
					</Button>
					<Button variant="outline" size="sm" className="rounded-lg">
						<Icons.Filter data-icon="inline-start" />
						Filter
					</Button>
					<Button size="sm" className="rounded-lg">
						<Icons.Export data-icon="inline-start" />
						Export
					</Button>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<SalesRepDesignActivityDataTable
					data={recentSales}
					initialSettings={initialSettings}
				/>
			</CardContent>
		</Card>
	);
}

// Inline target: apps/www/src/components/sales-rep/rep-avatar.tsx
function RepAvatar({ className }: { className?: string }) {
	return (
		<Avatar className={cn("rounded-xl", className)}>
			<AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
				{rep.initials}
			</AvatarFallback>
		</Avatar>
	);
}
