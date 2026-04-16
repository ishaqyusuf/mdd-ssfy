"use client";

import type { ComponentType, ReactNode } from "react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";

import {
	OverviewProgressBar,
	OverviewSectionCard,
	OverviewSectionLabel,
} from "../../section-primitives";

export function OverviewV2HeroCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.95))] shadow-sm",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function OverviewV2Metric({
	label,
	value,
	helper,
	tone = "slate",
}: {
	label: string;
	value: string;
	helper?: string;
	tone?: "emerald" | "amber" | "blue" | "violet" | "slate";
}) {
	const toneMap: Record<string, string> = {
		emerald: "border-emerald-200 bg-emerald-50/80",
		amber: "border-amber-200 bg-amber-50/80",
		blue: "border-blue-200 bg-blue-50/80",
		violet: "border-violet-200 bg-violet-50/80",
		slate: "border-slate-200 bg-white/80",
	};

	return (
		<div className={cn("rounded-2xl border p-4", toneMap[tone])}>
			<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
			{helper ? (
				<p className="mt-2 text-xs text-muted-foreground">{helper}</p>
			) : null}
		</div>
	);
}

export function OverviewV2InfoCard({
	icon,
	label,
	eyebrow,
	children,
	className,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	eyebrow?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<OverviewSectionCard className={cn("rounded-3xl p-5", className)}>
			<div className="flex items-start justify-between gap-3">
				<OverviewSectionLabel icon={icon} label={label} />
				{eyebrow ? (
					<Badge
						variant="outline"
						className="rounded-full px-2.5 py-1 text-[11px]"
					>
						{eyebrow}
					</Badge>
				) : null}
			</div>
			<div className="-mt-1 space-y-3">{children}</div>
		</OverviewSectionCard>
	);
}

export function OverviewV2InfoRow({
	label,
	value,
	action,
}: {
	label: string;
	value?: string | null;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/40 py-3 last:border-b-0 last:pb-0 first:pt-0">
			<p className="text-sm text-muted-foreground">{label}</p>
			<div className="max-w-[70%] text-right text-sm font-medium">
				{action ?? <span>{value || "—"}</span>}
			</div>
		</div>
	);
}

export function OverviewV2StatusCard({
	icon,
	label,
	status,
	statusTone,
	progressValue,
	progressColorClass,
	summary,
	detail,
	children,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	status: string;
	statusTone: "emerald" | "amber" | "blue" | "violet" | "slate";
	progressValue?: number;
	progressColorClass?: string;
	summary: string;
	detail?: string;
	children?: ReactNode;
}) {
	const toneMap: Record<string, string> = {
		emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
		amber: "border-amber-200 bg-amber-50/70 text-amber-700",
		blue: "border-blue-200 bg-blue-50/70 text-blue-700",
		violet: "border-violet-200 bg-violet-50/70 text-violet-700",
		slate: "border-slate-200 bg-slate-50/70 text-slate-700",
	};

	return (
		<OverviewSectionCard className="rounded-3xl p-5">
			<div className="flex items-start justify-between gap-3">
				<OverviewSectionLabel icon={icon} label={label} />
				<Badge
					variant="outline"
					className={cn(
						"rounded-full px-2.5 py-1 capitalize",
						toneMap[statusTone],
					)}
				>
					{status}
				</Badge>
			</div>
			<p className="-mt-1 text-lg font-semibold tracking-tight">{summary}</p>
			{detail ? (
				<p className="text-sm text-muted-foreground">{detail}</p>
			) : null}
			{typeof progressValue === "number" && progressColorClass ? (
				<div className="space-y-2 pt-2">
					<OverviewProgressBar
						value={progressValue}
						colorClass={progressColorClass}
					/>
					<p className="text-xs text-muted-foreground">
						{Math.round(progressValue)}% complete
					</p>
				</div>
			) : null}
			{children ? <div className="pt-3">{children}</div> : null}
		</OverviewSectionCard>
	);
}

export function OverviewV2ActionLink({
	children,
	onClick,
}: {
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<Button
			variant="ghost"
			size="xs"
			className="h-auto px-1 py-0 text-sm font-medium"
			onClick={onClick}
		>
			{children}
		</Button>
	);
}
