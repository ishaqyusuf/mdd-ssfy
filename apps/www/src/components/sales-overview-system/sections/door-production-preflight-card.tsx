"use client";

import { useTRPC } from "@/trpc/client";
import {
	type DoorProductionPreflightCheck,
	type DoorProductionPreflightStatus,
	deriveDoorProductionPreflight,
} from "@gnd/sales/sales-overview-production-preflight";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { useSalesOverviewSystem } from "../provider";

function statusStyles(status: DoorProductionPreflightStatus) {
	switch (status) {
		case "ready":
			return {
				icon: Icons.CheckCircle2,
				iconClassName: "text-emerald-600",
				badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
				label: "Ready",
			};
		case "review":
			return {
				icon: Icons.AlertTriangle,
				iconClassName: "text-amber-600",
				badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
				label: "Review",
			};
		case "blocked":
			return {
				icon: Icons.XCircle,
				iconClassName: "text-red-600",
				badgeClassName: "border-red-200 bg-red-50 text-red-700",
				label: "Blocked",
			};
		default:
			return {
				icon: Icons.Minus,
				iconClassName: "text-slate-500",
				badgeClassName: "border-slate-200 bg-slate-50 text-slate-600",
				label: "N/A",
			};
	}
}

function PreflightCheckRow({
	check,
	onReview,
}: {
	check: DoorProductionPreflightCheck;
	onReview: (check: DoorProductionPreflightCheck) => void;
}) {
	const style = statusStyles(check.status);
	const Icon = style.icon;

	return (
		<div className="flex min-w-0 items-start gap-3 rounded-lg border border-border/60 p-3">
			<Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClassName)} />
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm font-medium">{check.label}</p>
					<Badge
						variant="outline"
						className={cn("h-5 px-1.5 text-[10px]", style.badgeClassName)}
					>
						{style.label}
					</Badge>
				</div>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					{check.detail}
				</p>
			</div>
			{check.actionTab ? (
				<Button
					type="button"
					size="xs"
					variant="ghost"
					className="shrink-0"
					onClick={() => onReview(check)}
				>
					Review
					<Icons.ChevronRight className="ml-1 size-3" />
				</Button>
			) : null}
		</div>
	);
}

export function DoorProductionPreflightCard() {
	const {
		state: { data, isAdmin, isQuote },
		actions: { setCurrentTab },
	} = useSalesOverviewSystem();
	const trpc = useTRPC();
	const salesOrderId = Number(data?.id || 0);
	const inventoryQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions(
			{
				salesOrderId,
			},
			{
				enabled: isAdmin && !isQuote && salesOrderId > 0,
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);

	if (!isAdmin || isQuote || !salesOrderId) return null;

	if (inventoryQuery.isLoading) {
		return (
			<Card className="border-border/60">
				<CardContent className="flex items-center gap-3 p-4">
					<Icons.spinner className="size-4 animate-spin text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Production Preflight</p>
						<p className="text-xs text-muted-foreground">
							Checking door, pricing, inventory, fulfillment, and PDF readiness.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (inventoryQuery.isError) {
		return (
			<Card className="border-red-200">
				<CardContent className="flex items-center justify-between gap-3 p-4">
					<div>
						<p className="text-sm font-medium">
							Production Preflight unavailable
						</p>
						<p className="text-xs text-muted-foreground">
							Inventory readiness could not be verified. No handoff decision was
							made.
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => inventoryQuery.refetch()}
					>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	const preflight = deriveDoorProductionPreflight({
		sale: data,
		inventory: inventoryQuery.data,
	});
	const overallStyle = statusStyles(preflight.overallStatus);
	const OverallIcon = overallStyle.icon;

	return (
		<Card className="border-border/60">
			<CardHeader className="space-y-2 pb-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<Icons.copyDone className="size-4" />
							Production Preflight
						</CardTitle>
						<p className="mt-1 text-xs text-muted-foreground">
							Manager check before door production handoff.
						</p>
					</div>
					<Badge
						variant="outline"
						className={cn("gap-1.5", overallStyle.badgeClassName)}
					>
						<OverallIcon className="size-3.5" />
						{preflight.overallStatus === "ready"
							? "Ready for handoff"
							: preflight.overallStatus === "review"
								? "Needs review"
								: "Blocked"}
					</Badge>
				</div>
				<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
					<span>{preflight.counts.ready} ready</span>
					<span>•</span>
					<span>{preflight.counts.review} review</span>
					<span>•</span>
					<span>{preflight.counts.blocked} blocked</span>
				</div>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				{preflight.checks.map((check) => (
					<PreflightCheckRow
						key={check.id}
						check={check}
						onReview={(selected) => {
							if (selected.actionTab) setCurrentTab(selected.actionTab);
						}}
					/>
				))}
			</CardContent>
		</Card>
	);
}
