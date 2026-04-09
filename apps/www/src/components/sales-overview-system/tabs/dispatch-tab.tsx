"use client";

import { Icons } from "@gnd/ui/icons";

import { useTRPC } from "@/trpc/client";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";
import { formatPercent, getProgressValue, getStatusLabel } from "../view-model";

function SectionLabel({
	icon: Icon,
	label,
}: {
	icon: React.ElementType;
	label: string;
}) {
	return (
		<div className="flex items-center gap-2 pb-3">
			<Icon className="size-3.5 text-muted-foreground" />
			<span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
		</div>
	);
}

function ProgressBar({
	value,
	colorClass,
}: {
	value: number;
	colorClass: string;
}) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={cn("h-full rounded-full transition-all", colorClass)}
				style={{ width: `${getProgressValue(value)}%` }}
			/>
		</div>
	);
}

function statusVariant(
	status?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "completed":
		case "delivered":
			return "default";
		case "in-progress":
		case "in progress":
			return "secondary";
		case "cancelled":
			return "destructive";
		default:
			return "outline";
	}
}

export function SalesOverviewDispatchTab() {
	const { dispatchId, overviewId } = useSalesOverviewSystem();
	const trpc = useTRPC();

	const { data } = useQuery(
		trpc.dispatch.orderDispatchOverview.queryOptions(
			{ salesNo: overviewId },
			{ enabled: !!overviewId },
		),
	);

	const deliveries = dispatchId
		? (data?.deliveries || []).filter(
				(d) => String(d?.id) === String(dispatchId),
			)
		: data?.deliveries || [];

	const progressPct = Number(data?.progress?.percentage || 0);

	return (
		<div className="space-y-5 p-1">
			{/* Overall progress */}
			<div className="rounded-xl border bg-card p-5">
				<SectionLabel icon={Icons.Truck} label="Dispatch Overview" />
				<div className="mb-3 space-y-1.5">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Overall completion</span>
						<span className="font-semibold">{formatPercent(progressPct)}</span>
					</div>
					<ProgressBar
						value={progressPct}
						colorClass={progressPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}
					/>
				</div>
				{deliveries.length > 0 && (
					<p className="text-xs text-muted-foreground">
						{deliveries.length} dispatch{" "}
						{deliveries.length === 1 ? "entry" : "entries"}
					</p>
				)}
			</div>

			{/* Delivery entries */}
			{deliveries.length === 0 ? (
				<div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
					No dispatch data available for this order.
				</div>
			) : (
				<div className="space-y-4">
					{deliveries.map((delivery) => (
						<div key={delivery.id} className="rounded-xl border bg-card p-5">
							<div className="mb-4 flex items-start justify-between gap-3">
								<div>
									<p className="font-semibold">
										Dispatch #{delivery.id}
										{delivery.dispatchNumber
											? ` · ${delivery.dispatchNumber}`
											: ""}
									</p>
									<div className="mt-1 flex items-center gap-2">
										<Badge variant={statusVariant(delivery.status)}>
											<span className="capitalize">
												{getStatusLabel(delivery.status)}
											</span>
										</Badge>
									</div>
								</div>
							</div>

							<div className="grid gap-3 text-sm md:grid-cols-3">
								<div>
									<p className="text-xs text-muted-foreground">Mode</p>
									<p className="font-medium capitalize">
										{delivery.deliveryMode || "—"}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Driver</p>
									<p className="font-medium">
										{delivery.driver?.name || "Unassigned"}
									</p>
								</div>
								{delivery.dueDate && (
									<div>
										<p className="text-xs text-muted-foreground">Due Date</p>
										<p className="font-medium">
											{new Date(delivery.dueDate).toLocaleDateString("en-US")}
										</p>
									</div>
								)}
							</div>

							{/* Delivery address if available */}
							{(delivery as any)?.address && (
								<div className="mt-4 border-t border-border/40 pt-3">
									<div className="flex items-start gap-2">
										<Icons.MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											{[
												(delivery as any).address?.address1,
												(delivery as any).address?.city,
												(delivery as any).address?.state,
											]
												.filter(Boolean)
												.join(", ") || "Address not set"}
										</p>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
