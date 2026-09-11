/** @jsxImportSource react */
"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { getSalesPriorityLabel, normalizeSalesPriority } from "@sales/priority";
import Link from "next/link";
import { productionCalendarCardClasses } from "./calendar-colors";

export type PlanningItem =
	RouterOutputs["sales"]["productionPlanningCalendar"]["planning"][number];
export type PlanningCardProps = {
	item: PlanningItem;
	onOpen: (orderNo: string) => void;
	canEditDueDate: boolean;
};

export function PlanningCard({
	item,
	onOpen,
	canEditDueDate,
}: PlanningCardProps) {
	const isCritical = normalizeSalesPriority(item.priority) === "CRITICAL";
	const actionClass = isCritical
		? "border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent dark:hover:bg-white/10"
		: undefined;
	return (
		<article
			className={cn(
				"min-w-0 space-y-2 rounded p-2 text-xs",
				productionCalendarCardClasses(item.presentation.tone, item.priority),
				item.due.bucket === "past-due" && "ring-1 ring-rose-500",
			)}
		>
			<button
				type="button"
				className="block w-full break-words text-left font-semibold underline underline-offset-2"
				onClick={() => onOpen(item.orderNo)}
			>
				{item.orderNo}
			</button>
			<p className="break-words">{item.customer}</p>
			<p className="font-semibold">
				{item.label}
				{item.presentation.label !== item.label
					? ` · ${item.presentation.label}`
					: null}
			</p>
			<p>{item.headline.label}</p>
			<p>
				{item.dateProvenance}: <strong>{item.dueDate}</strong> ·{" "}
				{item.due.label}
			</p>
			<p>
				Required <strong>{item.requiredQty}</strong> · Assigned{" "}
				<strong>{item.assignedQty}</strong> · Uncovered{" "}
				<strong>{item.uncoveredQty}</strong>
			</p>
			{item.assignmentCount > 0 ? (
				<p>
					{item.assignmentCount}{" "}
					{item.assignmentCount === 1 ? "assignment" : "assignments"} ·{" "}
					{item.workers.join(" & ") || "Worker unavailable"}
				</p>
			) : null}
			<Badge
				variant="outline"
				className={isCritical ? "border-white/70 text-white" : undefined}
			>
				Priority: {getSalesPriorityLabel(item.priority)}
			</Badge>
			<p>
				Material:{" "}
				<strong>{item.material.applicability === "unknown"
					? "Readiness unavailable"
					: item.material.state}</strong>
			</p>
			{item.reviewMessage ? <p>{item.reviewMessage}</p> : null}
			<div className="flex flex-wrap gap-2">
				{item.canAssign ? (
					<Button
						variant="outline"
						className={actionClass}
						size="sm"
						onClick={() => onOpen(item.orderNo)}
					>
						Assign Production
					</Button>
				) : null}
				{canEditDueDate ? (
					<Button
						variant="outline"
						className={actionClass}
						size="sm"
						asChild
					>
						<Link
							href={`/sales-book/edit-order/${encodeURIComponent(item.slug)}`}
						>
							Edit order due date
						</Link>
					</Button>
				) : null}
			</div>
		</article>
	);
}
