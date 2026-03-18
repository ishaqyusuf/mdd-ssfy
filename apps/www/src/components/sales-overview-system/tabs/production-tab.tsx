"use client";

import { Factory, Layers } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";

import { cn } from "@gnd/ui/cn";
import { useQuery } from "@gnd/ui/tanstack";

import { useSalesOverviewSystem } from "../provider";
import { formatPercent, getProgressValue } from "../view-model";

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

function StatPill({
	label,
	value,
	colorClass,
}: {
	label: string;
	value: string;
	colorClass?: string;
}) {
	return (
		<div className="rounded-lg bg-muted/40 p-3 text-center">
			<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
				{label}
			</p>
			<p className={cn("mt-1 text-lg font-bold", colorClass)}>{value}</p>
		</div>
	);
}

export function SalesOverviewProductionTab() {
	const { accessView, data, isAdmin, overviewId } = useSalesOverviewSystem();
	const auth = useAuth();
	const trpc = useTRPC();

	const { data: productionData } = useQuery(
		trpc.sales.productionOverview.queryOptions(
			{
				salesNo: overviewId,
				assignedToId:
					accessView === "production" && !isAdmin
						? Number(auth.id || 0)
						: null,
			},
			{ enabled: !!overviewId },
		),
	);

	const items =
		productionData?.items?.filter((item) => item?.itemConfig?.production) || [];

	const assignedPct = Number(data?.stats?.prodAssigned?.percentage || 0);
	const completedPct = Number(data?.stats?.prodCompleted?.percentage || 0);

	return (
		<div className="space-y-5 p-1">
			{/* Summary stats */}
			<div className="rounded-xl border bg-card p-5">
				<SectionLabel icon={Factory} label="Production Summary" />
				<div className="mb-4 grid grid-cols-3 gap-3">
					<StatPill
						label="Assigned"
						value={formatPercent(assignedPct)}
						colorClass={assignedPct >= 100 ? "text-emerald-600" : "text-blue-600"}
					/>
					<StatPill
						label="Completed"
						value={formatPercent(completedPct)}
						colorClass={
							completedPct >= 100 ? "text-emerald-600" : "text-violet-600"
						}
					/>
					<StatPill
						label="Items"
						value={String(items.length)}
						colorClass="text-foreground"
					/>
				</div>
				<div className="space-y-3">
					<div className="space-y-1.5">
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Assignment coverage</span>
							<span>{formatPercent(assignedPct)}</span>
						</div>
						<ProgressBar value={assignedPct} colorClass="bg-blue-500" />
					</div>
					<div className="space-y-1.5">
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Completion progress</span>
							<span>{formatPercent(completedPct)}</span>
						</div>
						<ProgressBar
							value={completedPct}
							colorClass={
								completedPct >= 100 ? "bg-emerald-500" : "bg-violet-500"
							}
						/>
					</div>
				</div>
			</div>

			{/* Item list */}
			<div className="rounded-xl border bg-card p-5">
				<SectionLabel icon={Layers} label="Production Items" />
				{items.length === 0 ? (
					<div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
						No production items visible for this view.
					</div>
				) : (
					<div className="space-y-3">
						{items.map((item) => {
							const itemPct = Number(
								item?.analytics?.stats?.qty?.percentage || 0,
							);
							return (
								<div
									key={item.controlUid}
									className="rounded-lg border bg-muted/20 p-4"
								>
									<div className="mb-3 flex items-start justify-between gap-2">
										<div>
											<p className="font-semibold uppercase">{item.title}</p>
											{item.subtitle && (
												<p className="mt-0.5 text-xs uppercase text-muted-foreground">
													{item.subtitle}
												</p>
											)}
										</div>
										<span
											className={cn(
												"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
												itemPct >= 100
													? "bg-emerald-100 text-emerald-700"
													: itemPct > 0
														? "bg-amber-100 text-amber-700"
														: "bg-slate-100 text-slate-600",
											)}
										>
											{itemPct >= 100
												? "Done"
												: itemPct > 0
													? "In progress"
													: "Pending"}
										</span>
									</div>
									<div className="space-y-1.5">
										<ProgressBar
											value={itemPct}
											colorClass={
												itemPct >= 100
													? "bg-emerald-500"
													: itemPct > 0
														? "bg-amber-500"
														: "bg-slate-300"
											}
										/>
										<p className="text-xs text-muted-foreground">
											{formatPercent(itemPct)} complete
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
