"use client";

import type { AssistantAnalyticsResult } from "@api/assistant/analytics-result-contract";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@gnd/ui/chart";
import { ArrowUpRight, Database, History } from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";

function formatValue(result: AssistantAnalyticsResult, value: number) {
	if (result.unit === "currency") {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: result.currency ?? "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}
	if (result.unit === "percent") return `${value.toLocaleString()}%`;
	return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function AnalyticsTable({ result }: { result: AssistantAnalyticsResult }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[360px] text-left text-xs">
				<caption className="sr-only">{result.title} data</caption>
				<thead className="border-b text-muted-foreground">
					<tr>
						<th className="py-2 pr-3 font-medium">Group</th>
						<th className="py-2 pr-3 text-right font-medium">Value</th>
						<th className="w-8 py-2" aria-label="Actions" />
					</tr>
				</thead>
				<tbody>
					{result.rows.map((row, index) => (
						<tr
							key={`${row.label}-${index}`}
							className="border-b border-border/60 last:border-0"
						>
							<td className="py-2.5 pr-3">
								{row.label}
								{row.secondaryLabel ? (
									<span className="ml-2 text-muted-foreground">
										{row.secondaryLabel}
									</span>
								) : null}
							</td>
							<td className="py-2.5 pr-3 text-right font-medium tabular-nums">
								{formatValue(result, row.value)}
							</td>
							<td className="py-2.5 text-right">
								{row.drilldown ? (
									<a
										href={row.drilldown.href}
										aria-label={`${row.drilldown.label}: ${row.label}`}
										className="inline-flex text-muted-foreground hover:text-foreground"
									>
										<ArrowUpRight size={14} />
									</a>
								) : null}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function AnalyticsChart({ result }: { result: AssistantAnalyticsResult }) {
	const common = {
		data: result.rows,
		margin: { left: 0, right: 12, top: 12, bottom: 0 },
	};
	const axes = (
		<>
			<CartesianGrid vertical={false} strokeDasharray="3 5" />
			<XAxis
				dataKey="label"
				tickLine={false}
				axisLine={false}
				tickMargin={10}
			/>
			<YAxis
				tickLine={false}
				axisLine={false}
				width={54}
				tickFormatter={(value) => formatValue(result, Number(value))}
			/>
			<ChartTooltip
				content={
					<ChartTooltipContent
						formatter={(value) => formatValue(result, Number(value))}
					/>
				}
			/>
		</>
	);
	return (
		<ChartContainer
			config={{ value: { label: result.title, color: "#547568" } }}
			className="h-[240px] w-full"
		>
			{result.presentation === "bar" ? (
				<BarChart accessibilityLayer {...common}>
					{axes}
					<Bar
						dataKey="value"
						fill="var(--color-value)"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			) : result.presentation === "line" ? (
				<LineChart accessibilityLayer {...common}>
					{axes}
					<Line
						type="monotone"
						dataKey="value"
						stroke="var(--color-value)"
						strokeWidth={2}
						dot={{ r: 3 }}
					/>
				</LineChart>
			) : (
				<AreaChart accessibilityLayer {...common}>
					{axes}
					<Area
						type="monotone"
						dataKey="value"
						stroke="var(--color-value)"
						fill="var(--color-value)"
						fillOpacity={0.12}
						strokeWidth={2}
					/>
				</AreaChart>
			)}
		</ChartContainer>
	);
}

export function AssistantAnalyticsResultCard({
	result,
}: {
	result: AssistantAnalyticsResult;
}) {
	const isKpi = result.presentation === "kpi";
	const isTable = result.presentation === "table";
	const observedAt = new Date(result.freshness.observedAt);
	const observedLabel = new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(observedAt);
	return (
		<article className="my-3 overflow-hidden rounded-xl border bg-card shadow-sm">
			<header className="border-b px-4 py-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h3 className="text-sm font-semibold">{result.title}</h3>
						<p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
							{result.definition}
						</p>
					</div>
					<time
						dateTime={result.freshness.observedAt}
						title={result.freshness.label}
						className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"
					>
						<History size={11} /> As of {observedLabel}
					</time>
				</div>
			</header>
			<div className="px-4 py-4">
				{result.rows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No matching data for this date range.
					</p>
				) : isKpi ? (
					<div className="py-3">
						<strong className="text-3xl font-semibold tracking-tight tabular-nums">
							{formatValue(result, result.rows[0]?.value ?? 0)}
						</strong>
						<p className="mt-1 text-xs text-muted-foreground">
							{result.rows[0]?.label}
						</p>
					</div>
				) : isTable ? (
					<AnalyticsTable result={result} />
				) : (
					<>
						<AnalyticsChart result={result} />
						<details className="mt-3 border-t pt-3 text-xs text-muted-foreground">
							<summary className="cursor-pointer font-medium">
								View data table
							</summary>
							<div className="mt-2 text-foreground">
								<AnalyticsTable result={result} />
							</div>
						</details>
					</>
				)}
			</div>
			<footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/25 px-4 py-2.5 text-[11px] text-muted-foreground">
				<span>
					{result.dateRange.from} to {result.dateRange.to} ·{" "}
					{result.dateRange.timezone}
				</span>
				<span className="inline-flex items-center gap-1">
					<Database size={11} />{" "}
					{result.sources.map(({ label }) => label).join(", ")}
				</span>
			</footer>
		</article>
	);
}
