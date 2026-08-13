"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";

export function SpecialOrderRolloutSection() {
	const trpc = useTRPC();
	const rollout = useQuery(
		trpc.sales.getSpecialOrderRolloutMetrics.queryOptions(),
	);
	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle>Warning-mode rollout health</CardTitle>
					<Badge variant="outline">Last 30 days</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{rollout.isPending || !rollout.data ? (
					<div className="h-32 animate-pulse rounded-md bg-muted/30" />
				) : (
					<>
						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							{[
								{
									label: "Pending approval",
									value:
										Number(rollout.data.statuses.SIGNATURE_PENDING || 0) +
										Number(rollout.data.statuses.REAPPROVAL_REQUIRED || 0),
								},
								{
									label: "Approved",
									value: Number(rollout.data.statuses.CUSTOMER_APPROVED || 0),
								},
								{
									label: "Email failures",
									value:
										rollout.data.requestFailures +
										rollout.data.notificationFailures,
								},
								{
									label: "Oldest pending",
									value:
										rollout.data.oldestPendingDays == null
											? "—"
											: `${rollout.data.oldestPendingDays}d`,
								},
							].map((metric) => (
								<div key={metric.label} className="rounded-md border p-3">
									<p className="text-xs text-muted-foreground">
										{metric.label}
									</p>
									<p className="mt-1 text-2xl font-semibold">{metric.value}</p>
								</div>
							))}
						</div>
						<div className="grid gap-3 text-sm sm:grid-cols-2">
							<div className="rounded-md border p-3">
								<p className="font-medium">Customer responses</p>
								<p className="mt-1 text-muted-foreground">
									{Number(rollout.data.outcomes.APPROVED || 0)} approved ·{" "}
									{Number(rollout.data.outcomes.DECLINED || 0)} declined ·{" "}
									{rollout.data.reapprovalCount} reapproval requests
								</p>
							</div>
							<div className="rounded-md border p-3">
								<p className="font-medium">Link safety</p>
								<p className="mt-1 text-muted-foreground">
									{rollout.data.staleLinkCount} stale ·{" "}
									{rollout.data.expiredLinkCount} expired link uses
								</p>
							</div>
						</div>
						<div className="rounded-md border">
							<div className="grid grid-cols-3 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
								<span>Operation</span>
								<span>Result</span>
								<span className="text-right">Count</span>
							</div>
							{rollout.data.operationCounts.length ? (
								rollout.data.operationCounts.map((row) => (
									<div
										key={`${row.operation}-${row.result}`}
										className="grid grid-cols-3 px-3 py-2 text-sm"
									>
										<span>{row.operation.toLowerCase()}</span>
										<span>{row.result.toLowerCase()}</span>
										<span className="text-right tabular-nums">{row.count}</span>
									</div>
								))
							) : (
								<p className="px-3 py-4 text-sm text-muted-foreground">
									No governed operation encounters in this period.
								</p>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
