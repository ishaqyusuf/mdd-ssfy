"use client";

import type { ReactNode } from "react";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";

export type SalesInboundStatus = "AVAILABLE" | "ORDERED" | "PENDING ORDER";

export function normalizeSalesInboundStatus(
	status?: string | null,
): SalesInboundStatus | null {
	const value = String(status || "")
		.trim()
		.toUpperCase();

	if (
		value === "AVAILABLE" ||
		value === "ORDERED" ||
		value === "PENDING ORDER"
	) {
		return value;
	}

	return null;
}

function getSalesInboundStatusToneClassName(status?: string | null) {
	switch (normalizeSalesInboundStatus(status)) {
		case "AVAILABLE":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "ORDERED":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "PENDING ORDER":
			return "border-amber-300 bg-amber-50 text-amber-800";
		default:
			return "border-slate-200 bg-slate-50 text-slate-600";
	}
}

export function salesInboundRowClassName(status?: string | null) {
	return normalizeSalesInboundStatus(status) === "PENDING ORDER"
		? "bg-amber-50/60 hover:bg-amber-100/70"
		: "";
}

export function SalesInboundStatusBadge({
	status,
	className,
	emptyClassName,
	emptyFallback = "-",
}: {
	status?: string | null;
	className?: string;
	emptyClassName?: string;
	emptyFallback?: ReactNode;
}) {
	const normalizedStatus = normalizeSalesInboundStatus(status);

	if (!normalizedStatus) {
		if (emptyFallback === null) return null;

		return (
			<span className={cn("text-muted-foreground", emptyClassName)}>
				{emptyFallback}
			</span>
		);
	}

	return (
		<Badge
			variant="outline"
			className={cn(
				"whitespace-nowrap rounded-full text-[11px] font-semibold uppercase",
				getSalesInboundStatusToneClassName(normalizedStatus),
				className,
			)}
		>
			{normalizedStatus}
		</Badge>
	);
}
