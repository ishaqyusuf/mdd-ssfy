"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { buildSalesOverviewUrl } from "@/hooks/sales-overview-open-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryProductionPlanRow =
	RouterOutputs["inventories"]["salesProductionPlan"]["components"][number];

type Column = ColumnDef<InventoryProductionPlanRow>;

const readinessToneClassName: Record<
	InventoryProductionPlanRow["readiness"],
	string
> = {
	ready_for_production: "border-emerald-200 bg-emerald-50 text-emerald-700",
	fulfilled: "border-blue-200 bg-blue-50 text-blue-700",
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	allocation_review: "border-violet-200 bg-violet-50 text-violet-700",
	blocked: "border-rose-200 bg-rose-50 text-rose-700",
};

const stockToneClassName: Record<
	InventoryProductionPlanRow["stockStatus"],
	string
> = {
	allocated: "border-emerald-200 bg-emerald-50 text-emerald-700",
	pending_review: "border-violet-200 bg-violet-50 text-violet-700",
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	partially_received: "border-blue-200 bg-blue-50 text-blue-700",
	ready_after_receive: "border-cyan-200 bg-cyan-50 text-cyan-700",
	shortage: "border-rose-200 bg-rose-50 text-rose-700",
	fulfilled: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getSalesOverviewUrl(orderId: string | null) {
	if (!orderId) return null;
	return buildSalesOverviewUrl(orderId, "sales-production", {
		salesTab: "production",
	});
}

export function getInventoryProductionPlanRowId(
	row: InventoryProductionPlanRow,
) {
	return [
		row.salesOrderId ?? "sale",
		row.lineItemId ?? "line",
		row.componentId ?? "component",
		row.inventoryVariantId ?? "variant",
	].join("-");
}

const componentColumn: Column = {
	id: "component",
	header: "Component",
	accessorKey: "componentName",
	...sizes.custom(200, 380, 250),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Component",
		className: sizeClass(
			sizes.custom(200, 380, 250),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.componentName || "Unknown component"}
			/>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				{row.original.inventoryVariantSku ? (
					<Badge
						variant="outline"
						className="h-5 max-w-[130px] px-1.5 text-[10px]"
					>
						<span className="truncate">{row.original.inventoryVariantSku}</span>
					</Badge>
				) : null}
				{row.original.required ? (
					<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
						Required
					</Badge>
				) : (
					<Badge variant="outline" className="h-5 px-1.5 text-[10px]">
						Optional
					</Badge>
				)}
			</div>
		</div>
	),
};

const orderColumn: Column = {
	id: "order",
	header: "Order",
	accessorKey: "orderId",
	...sizes.custom(160, 280, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Order",
		className: sizeClass(sizes.custom(160, 280, 190)),
	},
	cell: ({ row }) => {
		const item = row.original;
		const overviewUrl = getSalesOverviewUrl(item.orderId);

		return (
			<div className="min-w-0 space-y-0.5">
				{overviewUrl ? (
					<Link
						href={overviewUrl}
						className="block max-w-full truncate font-medium text-primary hover:underline"
						onClick={(event) => event.stopPropagation()}
					>
						Order {item.orderId || item.salesOrderId || "N/A"}
					</Link>
				) : (
					<p className="truncate font-medium">
						Order {item.orderId || item.salesOrderId || "N/A"}
					</p>
				)}
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={item.customerName || "Unknown customer"}
				/>
			</div>
		);
	},
};

const lineColumn: Column = {
	id: "line",
	header: "Line",
	accessorKey: "lineTitle",
	...sizes.custom(190, 340, 230),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Line",
		className: sizeClass(sizes.custom(190, 340, 230)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate"
			text={row.original.lineTitle || "Untitled line item"}
		/>
	),
};

const readinessColumn: Column = {
	id: "readiness",
	header: "Readiness",
	accessorKey: "readiness",
	...sizes.custom(124, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-32" },
		headerLabel: "Readiness",
		className: sizeClass(sizes.custom(124, 190, 140)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={`h-6 max-w-full px-2 text-[11px] capitalize ${readinessToneClassName[row.original.readiness]}`}
		>
			<span className="truncate">{formatLabel(row.original.readiness)}</span>
		</Badge>
	),
};

const stockColumn: Column = {
	id: "stock",
	header: "Stock",
	accessorKey: "stockStatus",
	...sizes.custom(136, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Stock",
		className: sizeClass(sizes.custom(136, 220, 160)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<Badge
				variant="outline"
				className={`h-6 max-w-full px-2 text-[11px] capitalize ${stockToneClassName[row.original.stockStatus]}`}
			>
				<span className="truncate">
					{formatLabel(row.original.stockStatus)}
				</span>
			</Badge>
			<p className="truncate text-xs text-muted-foreground">
				Line {formatLabel(row.original.lineReadiness)}
			</p>
		</div>
	),
};

const supplierColumn: Column = {
	id: "supplier",
	header: "Supplier",
	accessorKey: "supplierName",
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Supplier",
		className: sizeClass(sizes.custom(150, 260, 180)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.supplierName || "Unassigned supplier"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				Variant #{row.original.inventoryVariantId || "N/A"}
			</p>
		</div>
	),
};

const coverageColumn: Column = {
	id: "coverage",
	header: "Coverage",
	accessorKey: "remainingQty",
	...sizes.custom(190, 300, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Coverage",
		className: sizeClass(sizes.custom(190, 300, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<p className="truncate">
				<span className="text-muted-foreground">Need</span>{" "}
				<span className="font-mono font-medium">
					{formatQty(row.original.remainingQty)}
				</span>
				<span className="text-muted-foreground"> / Allocated</span>{" "}
				<span className="font-mono font-medium">
					{formatQty(row.original.allocatedQty)}
				</span>
			</p>
			<p className="truncate text-muted-foreground">
				Review {formatQty(row.original.pendingReviewQty)} / Inbound{" "}
				{formatQty(row.original.inboundQty)} / Short{" "}
				{formatQty(row.original.backorderedQty)}
			</p>
		</div>
	),
};

const receivedColumn: Column = {
	id: "received",
	header: "Received",
	accessorKey: "receivedQty",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Received",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.receivedQty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Ordered {formatQty(row.original.orderedQty)}
			</p>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(104, 140, 116),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-20" },
		className: sizeClass(
			sizes.custom(104, 140, 116),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => {
		const overviewUrl = getSalesOverviewUrl(row.original.orderId);

		return (
			<div className="relative z-10 flex justify-end">
				<Button
					asChild={Boolean(overviewUrl)}
					type="button"
					size="sm"
					variant="outline"
					disabled={!overviewUrl}
					className="h-8 px-2 text-xs"
					onClick={(event) => event.stopPropagation()}
				>
					{overviewUrl ? (
						<Link href={overviewUrl}>
							<Icons.ExternalLink className="mr-1.5 size-3.5" />
							Open
						</Link>
					) : (
						<span>Open</span>
					)}
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [
	componentColumn,
	orderColumn,
	lineColumn,
	readinessColumn,
	stockColumn,
	supplierColumn,
	coverageColumn,
	receivedColumn,
	actionsColumn,
];

export function getInventoryProductionPlanColumns(): Column[] {
	return columns;
}
