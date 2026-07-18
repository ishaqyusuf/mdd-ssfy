"use client";

import ProgressStatus from "@/components/_v1/progress-status";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesRepCommissionRow = {
	id: number;
	paymentId: string;
	paymentDate: string;
	amount: number;
	paidTo?: string | null;
	orderNo?: string | null;
	status: string;
};

type Column = ColumnDef<SalesRepCommissionRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function getSalesRepCommissionRowId(row: SalesRepCommissionRow) {
	return String(row.id);
}

const commissionColumn: Column = {
	id: "paymentId",
	header: "Commission",
	accessorKey: "paymentId",
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Commission",
		className: sizeClass(
			sizes.custom(150, 240, 170),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono font-semibold"
			text={row.original.paymentId}
		/>
	),
};

const orderColumn: Column = {
	id: "orderNo",
	header: "Order",
	accessorKey: "orderNo",
	...sizes.custom(120, 200, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Order",
		className: sizeClass(sizes.custom(120, 200, 140)),
	},
	cell: ({ row }) =>
		row.original.orderNo ? (
			<Badge
				variant="outline"
				className="h-5 rounded-full font-mono text-[10px]"
			>
				{row.original.orderNo}
			</Badge>
		) : (
			<span className="text-muted-foreground">No order</span>
		),
};

const paidToColumn: Column = {
	id: "paidTo",
	header: "Rep",
	accessorKey: "paidTo",
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Rep",
		className: sizeClass(sizes.custom(150, 260, 180)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.paidTo || "Unknown"}
		/>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(110, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(110, 180, 130), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-semibold">
			{formatCurrency(row.original.amount)}
		</span>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(120, 190, 140), "justify-end"),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<div className="flex justify-end">
			<ProgressStatus status={row.original.status} />
		</div>
	),
};

export const columns: Column[] = [
	commissionColumn,
	orderColumn,
	paidToColumn,
	amountColumn,
	statusColumn,
];
