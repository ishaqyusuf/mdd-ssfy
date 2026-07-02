"use client";

import type { ReactNode } from "react";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";

export type SalesInboundStatus = "AVAILABLE" | "ORDERED" | "PENDING ORDER";

export type InventoryInboundStatusSummary = {
	id: number;
	status?: string | null;
};

export type InventoryInboundOwnershipLike = {
	hasInventoryInbound?: boolean | null;
	linkedInboundIds?: number[] | null;
	linkedInbounds?: InventoryInboundStatusSummary[] | null;
	linkedInboundCount?: number | null;
	primaryInboundStatus?: string | null;
};

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

export function formatInventoryInboundStatusLabel(status?: string | null) {
	const value = String(status || "")
		.trim()
		.toLowerCase();

	switch (value) {
		case "in_progress":
			return "In progress";
		case "issue_open":
			return "Issue open";
		case "completed":
			return "Received";
		case "closed":
			return "Closed";
		case "cancelled":
			return "Cancelled";
		case "pending":
			return "Pending";
		default:
			return value
				? value
						.replaceAll("_", " ")
						.replace(/\b[a-z]/g, (char) => char.toUpperCase())
				: "Inventory inbound";
	}
}

export function getInventoryInboundStatusToneClassName(
	status?: string | null,
) {
	switch (String(status || "").toLowerCase()) {
		case "completed":
		case "closed":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "in_progress":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "issue_open":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "cancelled":
			return "border-red-200 bg-red-50 text-red-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

export function getInventoryInboundSummaries(
	ownership?: InventoryInboundOwnershipLike | null,
) {
	const linkedInbounds = ownership?.linkedInbounds ?? [];
	if (linkedInbounds.length) return linkedInbounds;

	const primaryStatus = ownership?.primaryInboundStatus ?? null;
	return (ownership?.linkedInboundIds ?? []).map((id, index) => ({
		id,
		status: index === 0 ? primaryStatus : null,
	}));
}

export function getSingleInventoryInboundId(
	ownership?: InventoryInboundOwnershipLike | null,
) {
	const linkedInbounds = getInventoryInboundSummaries(ownership);
	return linkedInbounds.length === 1 ? linkedInbounds[0]?.id ?? null : null;
}

export function getInventoryInboundOwnershipStatus(
	ownership?: InventoryInboundOwnershipLike | null,
) {
	const linkedInbounds = getInventoryInboundSummaries(ownership);
	if (linkedInbounds.length !== 1) return null;

	return linkedInbounds[0]?.status ?? ownership?.primaryInboundStatus ?? null;
}

export function getInventoryInboundOwnershipLabel(
	ownership?: InventoryInboundOwnershipLike | null,
) {
	const linkedInbounds = getInventoryInboundSummaries(ownership);

	if (linkedInbounds.length === 1) {
		const linkedInbound = linkedInbounds[0];
		const status = linkedInbound?.status ?? ownership?.primaryInboundStatus;

		return status
			? formatInventoryInboundStatusLabel(status)
			: `Inbound #${linkedInbound?.id}`;
	}

	if (linkedInbounds.length > 1) return `${linkedInbounds.length} inbounds`;
	if (ownership?.linkedInboundCount && ownership.linkedInboundCount > 1) {
		return `${ownership.linkedInboundCount} inbounds`;
	}

	return "Inventory inbound";
}

export function getInventoryInboundOwnershipTitle(
	ownership?: InventoryInboundOwnershipLike | null,
) {
	const linkedInbounds = getInventoryInboundSummaries(ownership);

	if (linkedInbounds.length === 1) {
		const linkedInbound = linkedInbounds[0];
		const status = linkedInbound?.status ?? ownership?.primaryInboundStatus;
		const statusLabel = status ? formatInventoryInboundStatusLabel(status) : null;

		return statusLabel
			? `Inventory inbound status - inbound #${linkedInbound?.id} - ${statusLabel}`
			: `Inventory inbound status - inbound #${linkedInbound?.id}`;
	}

	if (linkedInbounds.length > 1) {
		return `Inventory inbound status - ${linkedInbounds.length} linked inbounds`;
	}

	if (ownership?.linkedInboundCount && ownership.linkedInboundCount > 1) {
		return `Inventory inbound status - ${ownership.linkedInboundCount} linked inbounds`;
	}

	return "Inventory inbound status";
}

export function InventoryInboundStatusBadge({
	ownership,
	className,
}: {
	ownership?: InventoryInboundOwnershipLike | null;
	className?: string;
}) {
	const status = getInventoryInboundOwnershipStatus(ownership);

	return (
		<Badge
			variant="outline"
			title={getInventoryInboundOwnershipTitle(ownership)}
			className={cn(
				"whitespace-nowrap rounded-full text-[11px] font-semibold uppercase",
				getInventoryInboundStatusToneClassName(status),
				className,
			)}
		>
			{getInventoryInboundOwnershipLabel(ownership)}
		</Badge>
	);
}

export function SalesInboundStatusBadge({
	status,
	className,
	emptyClassName,
	emptyFallback = "-",
	title,
}: {
	status?: string | null;
	className?: string;
	emptyClassName?: string;
	emptyFallback?: ReactNode;
	title?: string;
}) {
	const normalizedStatus = normalizeSalesInboundStatus(status);

	if (!normalizedStatus) {
		if (emptyFallback === null) return null;

		return (
			<span className={cn("text-muted-foreground", emptyClassName)} title={title}>
				{emptyFallback}
			</span>
		);
	}

	return (
		<Badge
			variant="outline"
			title={title}
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
