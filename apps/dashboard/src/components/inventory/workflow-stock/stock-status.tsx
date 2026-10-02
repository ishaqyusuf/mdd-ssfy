"use client";

import type { StockStatus } from "@gnd/inventory/stock-status";
import { cn } from "@gnd/ui/cn";
import {
	BellOff,
	Check,
	CircleAlert,
	CircleMinus,
	CircleX,
	Clock,
	HelpCircle,
	TriangleAlert,
} from "lucide-react";

export type WorkflowStockStatus =
	| StockStatus
	| "mapping"
	| "loading"
	| "unavailable";
export const stockStatusLabels: Record<WorkflowStockStatus, string> = {
	available: "Available",
	low_stock: "Low stock",
	out_of_stock: "Out of stock",
	mixed: "Some variants need attention",
	alerts_off: "Stock alerts off",
	mapping: "Stock mapping needed",
	loading: "Checking stock",
	unavailable: "Stock unavailable",
};
const statusIcons = {
	available: Check,
	low_stock: TriangleAlert,
	out_of_stock: CircleMinus,
	mixed: CircleAlert,
	alerts_off: BellOff,
	mapping: HelpCircle,
	loading: Clock,
	unavailable: CircleX,
};
const statusColors: Record<WorkflowStockStatus, string> = {
	available: "text-emerald-700 dark:text-emerald-400",
	low_stock: "text-amber-700 dark:text-amber-400",
	mixed: "text-amber-700 dark:text-amber-400",
	out_of_stock: "text-red-600 dark:text-red-400",
	alerts_off: "text-muted-foreground",
	mapping: "text-muted-foreground",
	loading: "text-muted-foreground",
	unavailable: "text-muted-foreground",
};

export function WorkflowStockStatusIcon({
	status,
	className,
}: { status: WorkflowStockStatus; className?: string }) {
	const Icon = statusIcons[status];
	return (
		<Icon
			aria-hidden="true"
			className={cn("size-3.5 shrink-0", statusColors[status], className)}
		/>
	);
}

export function WorkflowStockStatusLabel({
	status,
}: { status: WorkflowStockStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-xs",
				statusColors[status],
			)}
		>
			<WorkflowStockStatusIcon status={status} />
			{stockStatusLabels[status]}
		</span>
	);
}

export function WorkflowStockCorner({
	status,
	title,
	uid,
	onOpen,
}: {
	status: WorkflowStockStatus;
	title: string;
	uid: string;
	onOpen: (trigger: HTMLElement) => void;
}) {
	return (
		<button
			type="button"
			data-stock-uid={uid}
			className="flex size-11 items-center justify-center"
			aria-label={`${title}: ${stockStatusLabels[status]}. Open inventory information`}
			title={stockStatusLabels[status]}
			onClick={(event) => {
				event.stopPropagation();
				onOpen(event.currentTarget);
			}}
		>
			<span
				className={cn(
					"flex size-6 items-center justify-center rounded-full border border-current bg-background shadow-sm",
					statusColors[status],
				)}
			>
				<WorkflowStockStatusIcon status={status} />
			</span>
		</button>
	);
}
