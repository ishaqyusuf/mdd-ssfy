"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/progress";
import {
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	MapPin,
	PackageCheck,
	Phone,
	TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import {
	type DriverStop,
	getDriverStopAction,
	getDriverStopAddress,
	getDriverStopCustomer,
	getDriverStopLabel,
	getDriverStopPhone,
	getStopReadiness,
	isDriverStopBlocked,
} from "./model";

function stopStatusVariant(stop: DriverStop) {
	if (stop.status === "completed") return "secondary" as const;
	if (isDriverStopBlocked(stop) || stop.dueBucket === "overdue") {
		return "destructive" as const;
	}
	return "outline" as const;
}

function openExternal(event: MouseEvent, url: string) {
	event.stopPropagation();
	window.open(url, "_blank", "noopener,noreferrer");
}

export function DriverStopCard({
	stop,
	featured = false,
	sequence,
	href,
	onPrimary,
}: {
	stop: DriverStop;
	featured?: boolean;
	sequence?: number;
	href: string;
	onPrimary: () => void;
}) {
	const address = getDriverStopAddress(stop);
	const phone = getDriverStopPhone(stop);
	const readiness = getStopReadiness(stop);
	const blocked = isDriverStopBlocked(stop);
	const inventoryLabel = ["in progress", "completed"].includes(stop.status)
		? "Verified"
		: stop.status === "packed" || stop.workspace?.stage === "ready_to_load"
			? "Review on stop"
			: "Pending review";

	if (featured) {
		return (
			<article className="overflow-hidden rounded-xl border bg-card shadow-sm">
				<header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
					<div>
						<h2 className="font-semibold">Next stop</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							One action at a time. Everything else stays secondary.
						</p>
					</div>
					<Badge variant={blocked ? "destructive" : "secondary"}>
						{blocked ? "Needs review" : getDriverStopLabel(stop)}
					</Badge>
				</header>
				<div className="space-y-4 p-4 sm:p-5">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
								Stop {sequence || 1} · Order {stop.order?.orderId || stop.id}
							</p>
							<h3 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
								{getDriverStopCustomer(stop)}
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{stop.deliveryMode === "pickup" ? "Pickup" : "Delivery"}
							</p>
						</div>
						<div className="shrink-0 text-right">
							<p className="text-sm font-semibold">{stop.dueStatusLabel}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{stop.dueDateLabel}
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="flex items-start gap-2 text-sm font-medium">
								<MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
								<span>{address || "Address review required"}</span>
							</p>
							<p className="ml-6 mt-1 text-xs text-muted-foreground">
								{address
									? "Confirm the destination before departure."
									: "Destination is missing from this assignment."}
							</p>
						</div>
						<div className="flex shrink-0 gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={!phone}
								aria-label="Call customer"
								onClick={(event) => openExternal(event, `tel:${phone}`)}
							>
								<Phone className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={!address}
								aria-label="Open navigation"
								onClick={(event) =>
									openExternal(
										event,
										`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
									)
								}
							>
								<MapPin className="size-4" />
							</Button>
						</div>
					</div>

					<div className="grid gap-2 sm:grid-cols-3">
						<div className="rounded-lg bg-muted/60 p-3">
							<p className="text-xs text-muted-foreground">Packing</p>
							<p className="mt-1 text-sm font-semibold">
								{readiness.total
									? `${readiness.packed} of ${readiness.total} packed`
									: getDriverStopLabel(stop) || "Review required"}
							</p>
						</div>
						<div className="rounded-lg bg-muted/60 p-3">
							<p className="text-xs text-muted-foreground">Inventory</p>
							<p className="mt-1 text-sm font-semibold">{inventoryLabel}</p>
						</div>
						<div
							className={`rounded-lg p-3 ${address ? "bg-muted/60" : "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100"}`}
						>
							<p className="text-xs opacity-70">Destination</p>
							<p className="mt-1 text-sm font-semibold">
								{address ? "Available" : "Needs review"}
							</p>
						</div>
					</div>

					<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
						<Button className="min-h-12" onClick={onPrimary}>
							{getDriverStopAction(stop)}
							<ArrowRight className="ml-2 size-4" />
						</Button>
						<Button asChild variant="outline" className="min-h-12">
							<Link href={href}>Review stop</Link>
						</Button>
					</div>
				</div>
			</article>
		);
	}

	return (
		<Link
			href={href}
			className="grid min-h-20 w-full grid-cols-[40px_minmax(0,1fr)_auto_20px] items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[48px_minmax(0,1fr)_150px_120px_20px]"
		>
			<span
				className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${stop.status === "in progress" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
			>
				{sequence}
			</span>
			<span className="min-w-0">
				<strong className="block truncate text-sm">
					{getDriverStopCustomer(stop)} · {stop.order?.orderId || stop.id}
				</strong>
				<small className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
					<CalendarClock className="size-3.5 shrink-0" />
					{stop.dueStatusLabel || "Schedule required"}
				</small>
			</span>
			<span className="hidden min-w-0 sm:block">
				<Progress value={readiness.percent} className="h-1.5" />
				<small className="mt-1 block text-xs text-muted-foreground">
					{readiness.total
						? `${readiness.packed} / ${readiness.total} packed`
						: "Manifest review"}
				</small>
			</span>
			<Badge
				variant={stopStatusVariant(stop)}
				className="max-w-[116px] truncate"
			>
				{blocked ? (
					<TriangleAlert className="mr-1 size-3" />
				) : stop.status === "completed" ? (
					<CheckCircle2 className="mr-1 size-3" />
				) : (
					<PackageCheck className="mr-1 size-3" />
				)}
				{getDriverStopLabel(stop)}
			</Badge>
			<ArrowRight className="size-4 text-muted-foreground" />
		</Link>
	);
}
