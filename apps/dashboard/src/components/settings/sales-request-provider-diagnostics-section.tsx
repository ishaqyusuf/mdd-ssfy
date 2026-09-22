"use client";

import { useTRPC } from "@/trpc/client";
import type { ChartConfig } from "@gnd/ui/chart";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@gnd/ui/chart";
import { Spinner } from "@gnd/ui/spinner";
import { useQuery } from "@gnd/ui/tanstack";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { SettingsCard } from "./settings-card";

const chartConfig = {
	succeeded: {
		label: "Successful",
		color: "var(--chart-2)",
	},
	failed: {
		label: "Failed",
		color: "var(--destructive)",
	},
} satisfies ChartConfig;

function formatFailureDetail(failure: {
	stage: string;
	cause?: string;
	finishReason?: string;
	repairAttempted?: boolean;
	configurationIssue?: string;
	routeFailureKind?: string;
	catalogFailureKind?: string;
	statusCode?: number;
	providerStatus?: string;
	retryable?: boolean;
	schemaIssues?: Array<{ code: string; path: string }>;
}) {
	const identity = [
		failure.stage,
		failure.cause,
		failure.configurationIssue,
		failure.routeFailureKind,
		failure.catalogFailureKind,
		failure.finishReason,
		failure.repairAttempted === undefined
			? undefined
			: failure.repairAttempted
				? "repair attempted"
				: "no repair",
		failure.statusCode,
		failure.providerStatus,
	]
		.filter((value) => value !== undefined)
		.join(" · ");
	const issue = failure.schemaIssues?.[0];
	return [
		identity,
		issue ? `${issue.code} at ${issue.path}` : null,
		failure.retryable === undefined
			? null
			: failure.retryable
				? "retryable"
				: "not retryable",
	]
		.filter(Boolean)
		.join(" · ");
}

export function SalesRequestProviderDiagnosticsSection() {
	const trpc = useTRPC();
	const diagnosticsQuery = useQuery(
		trpc.salesRequest.providerDiagnostics.queryOptions(undefined, {
			refetchInterval: 15_000,
			refetchIntervalInBackground: false,
		}),
	);

	return (
		<SettingsCard
			title="Provider API health"
			description="Retained Sales Request AI call history. Error metadata is allowlisted; request text, provider responses, credentials, and personal data are never logged."
		>
			{diagnosticsQuery.isPending ? (
				<div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
					<Spinner /> Loading provider diagnostics…
				</div>
			) : diagnosticsQuery.isError ? (
				<div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
					<p className="font-medium text-destructive">
						Provider diagnostics are unavailable
					</p>
					<p className="mt-1 text-muted-foreground">
						{diagnosticsQuery.error.message}
					</p>
				</div>
			) : (
				<div className="space-y-6">
					<div className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-md border p-3">
							<p className="text-xs text-muted-foreground">API attempts</p>
							<p className="mt-1 text-2xl font-semibold tabular-nums">
								{diagnosticsQuery.data.attemptCount}
							</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-xs text-muted-foreground">Failures</p>
							<p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
								{diagnosticsQuery.data.failureCount}
							</p>
						</div>
						<div className="rounded-md border p-3">
							<p className="text-xs text-muted-foreground">Window</p>
							<p className="mt-1 text-2xl font-semibold tabular-nums">
								{diagnosticsQuery.data.period.days} days
							</p>
						</div>
					</div>

					{diagnosticsQuery.data.providers.length ? (
						<ChartContainer config={chartConfig} className="h-[220px] w-full">
							<BarChart
								accessibilityLayer
								layout="vertical"
								data={diagnosticsQuery.data.providers.map((provider) => ({
									provider: provider.provider,
									succeeded: Math.max(0, provider.attempts - provider.failures),
									failed: provider.failures,
								}))}
								margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
							>
								<CartesianGrid horizontal={false} strokeDasharray="3 3" />
								<XAxis
									type="number"
									allowDecimals={false}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									type="category"
									dataKey="provider"
									axisLine={false}
									tickLine={false}
									width={82}
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dot" />}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								<Bar
									dataKey="succeeded"
									stackId="attempts"
									fill="var(--color-succeeded)"
								/>
								<Bar
									dataKey="failed"
									stackId="attempts"
									fill="var(--color-failed)"
									radius={[0, 4, 4, 0]}
								/>
							</BarChart>
						</ChartContainer>
					) : (
						<p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
							No provider calls were recorded in this window.
						</p>
					)}

					<div>
						<div className="mb-3 flex items-center justify-between gap-4">
							<h3 className="text-sm font-medium">Recent failures</h3>
							<p className="text-xs text-muted-foreground">
								Refreshes every 15 seconds
							</p>
						</div>
						{diagnosticsQuery.data.recentFailures.length ? (
							<div className="divide-y rounded-md border">
								{diagnosticsQuery.data.recentFailures.map((failure) => (
									<div
										key={`${failure.reference}-${failure.occurredAt.toISOString()}`}
										className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
									>
										<div className="min-w-0">
											<p className="font-medium">
												{failure.provider} · {failure.model}
											</p>
											<p className="mt-1 break-words text-xs text-muted-foreground">
												{formatFailureDetail(failure)}
											</p>
										</div>
										<div className="text-left text-xs text-muted-foreground sm:text-right">
											<p>{new Date(failure.occurredAt).toLocaleString()}</p>
											<p className="mt-1 font-mono">Run {failure.reference}</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								No provider failures were recorded in this window.
							</p>
						)}
						{diagnosticsQuery.data.truncated ? (
							<p className="mt-2 text-xs text-muted-foreground">
								The chart is capped at the latest 1,000 attempts.
							</p>
						) : null}
					</div>
				</div>
			)}
		</SettingsCard>
	);
}
