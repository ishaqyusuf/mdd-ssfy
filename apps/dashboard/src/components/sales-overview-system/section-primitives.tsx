"use client";

import type { ElementType, ReactNode } from "react";

import { cn } from "@gnd/ui/cn";

export function OverviewSectionCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("rounded-xl border bg-card p-5", className)}>
			{children}
		</div>
	);
}

export function OverviewSectionLabel({
	icon: Icon,
	label,
}: {
	icon: ElementType;
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

export function OverviewProgressBar({
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
				style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
			/>
		</div>
	);
}

export function OverviewEmptyState({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground",
				className,
			)}
		>
			{children}
		</div>
	);
}
