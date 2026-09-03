import type { ItemMaterialStatus } from "@gnd/sales/item-material-status";
import { Badge } from "@gnd/ui/badge";

import { formatBusinessDate } from "@/lib/format-business-date";
import { cn } from "@/lib/utils";

const toneClasses: Record<ItemMaterialStatus["tone"], string> = {
	success: "border-emerald-200 bg-emerald-50 text-emerald-700",
	warning: "border-amber-200 bg-amber-50 text-amber-800",
	info: "border-blue-200 bg-blue-50 text-blue-700",
	destructive: "border-red-200 bg-red-50 text-red-700",
	neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

type DeepPartial<T> = T extends Array<infer Item>
	? Array<DeepPartial<Item>>
	: T extends object
		? { [Key in keyof T]?: DeepPartial<T[Key]> }
		: T;

type ItemMaterialStatusView = DeepPartial<ItemMaterialStatus>;

export function ItemMaterialStatusBadge({
	status,
	className,
}: {
	status?: ItemMaterialStatusView | null;
	className?: string;
}) {
	if (!status?.code || !status.label || !status.tone) return null;
	const isReady = status.code === "material_ready";
	return (
		<span
			className={cn("inline-flex", className)}
			title={isReady ? undefined : status.explanation}
		>
			<Badge
				variant="outline"
				className={cn(
					"rounded-full text-[10px] font-semibold tracking-[0.08em]",
					toneClasses[status.tone],
				)}
			>
				{status.label}
			</Badge>
			{isReady ? null : <span className="sr-only">{status.explanation}</span>}
		</span>
	);
}

function formatQuantity(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatInboundStatus(value: string) {
	const normalized = value.replaceAll("_", " ").trim().toLowerCase();
	if (normalized === "in progress") return "INBOUND MATERIAL IN PROGRESS";
	if (normalized === "pending" || normalized === "ordered") {
		return "MATERIAL ORDERED";
	}
	if (normalized === "completed" || normalized === "received") {
		return "INBOUND MATERIAL RECEIVED";
	}
	return `INBOUND MATERIAL ${normalized.toUpperCase()}`;
}

function inboundTone(value: string) {
	const normalized = value.replaceAll("_", " ").trim().toLowerCase();
	if (normalized === "completed" || normalized === "received") {
		return "border-emerald-200 bg-emerald-50/80 text-emerald-950";
	}
	if (normalized.includes("issue") || normalized === "cancelled") {
		return "border-red-200 bg-red-50/80 text-red-950";
	}
	if (normalized === "pending" || normalized === "ordered") {
		return "border-amber-200 bg-amber-50/80 text-amber-950";
	}
	return "border-blue-200 bg-blue-50/80 text-blue-950";
}

export function ItemMaterialStatusDetail({
	status,
	className,
}: {
	status?: ItemMaterialStatusView | null;
	className?: string;
}) {
	if (!status?.code || !status.label || !status.tone) return null;
	if (status.code === "material_ready") return null;
	const inbounds = status.inbounds ?? [];
	const quantityGroups = status.quantityGroups ?? [];
	const blockers = status.blockers ?? [];
	if (status.code === "awaiting_inbound" && inbounds.length) {
		return (
			<div
				aria-label="Inbound material details"
				className={cn("space-y-1 text-xs uppercase", className)}
			>
				{inbounds.map((inbound, index) => (
					<div
						key={`${inbound.id ?? "unlinked"}-${index}`}
						className={cn(
							"flex flex-wrap items-center gap-x-2 gap-y-1 border-l-2 px-3 py-2",
							inboundTone(inbound.status || "unknown"),
						)}
					>
						<span className="font-semibold">
							{formatQuantity(inbound.quantity ?? 0)}×{" "}
							{formatInboundStatus(inbound.status || "unknown")}
						</span>
						<span aria-hidden="true">•</span>
						<span className="font-semibold">
							{inbound.supplierName || "No supplier"}
						</span>
						<span aria-hidden="true">•</span>
						<span className="font-semibold">
							{formatBusinessDate(inbound.expectedAt)
								? `Expected arrival ${formatBusinessDate(inbound.expectedAt)}`
								: "Arrival date pending"}
						</span>
					</div>
				))}
			</div>
		);
	}
	return (
		<section
			aria-label="Material status details"
			className={cn("rounded-xl border bg-background p-3", className)}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<ItemMaterialStatusBadge status={status} />
				<span className="text-[10px] text-muted-foreground">
					Evidence {status.evidenceRevision?.slice(0, 10) || "unavailable"}
				</span>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">
				{status.explanation || "Material evidence is unavailable."}
			</p>
			{quantityGroups.length ? (
				<dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
					{quantityGroups.map((group) => (
						<div
							key={group.unit || "EA"}
							className="rounded-lg bg-muted/40 p-2"
						>
							<dt className="font-medium uppercase tracking-wide">
								{group.unit || "EA"}
							</dt>
							<dd className="mt-1 text-muted-foreground">
								{formatQuantity(group.received ?? 0)} received ·{" "}
								{formatQuantity(group.committedAllocated ?? 0)} allocated ·{" "}
								{formatQuantity(group.pendingAllocation ?? 0)} pending
								allocation · {formatQuantity(group.openInbound ?? 0)} inbound ·{" "}
								{formatQuantity(group.required ?? 0)} required
							</dd>
						</div>
					))}
				</dl>
			) : null}
			{blockers.length ? (
				<ul className="mt-3 space-y-1 text-xs text-muted-foreground">
					{blockers.map((blocker) => (
						<li
							key={`${String(blocker.componentId)}-${blocker.code || "unknown"}`}
						>
							<span className="font-medium text-foreground">
								{blocker.componentName || "Material"}:
							</span>{" "}
							{blocker.explanation || "Material evidence is unavailable."}
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
