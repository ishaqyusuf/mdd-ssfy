"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesRepCommissionPaymentRow = {
	id: number;
	paymentId: string;
	paymentDate: string;
	amount: number;
	paidTo?: string | null;
};

type Column = ColumnDef<SalesRepCommissionPaymentRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function getSalesRepCommissionPaymentRowId(
	row: SalesRepCommissionPaymentRow,
) {
	return String(row.id);
}

const paymentColumn: Column = {
	id: "paymentId",
	header: "Payment",
	accessorKey: "paymentId",
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Payment",
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

const dateColumn: Column = {
	id: "paymentDate",
	header: "Date",
	accessorKey: "paymentDate",
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Date",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => (
		<span className="block truncate text-muted-foreground">
			{row.original.paymentDate || "Not set"}
		</span>
	),
};

const paidToColumn: Column = {
	id: "paidTo",
	header: "Paid To",
	accessorKey: "paidTo",
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Paid To",
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

const receiptColumn: Column = {
	id: "receipt",
	header: "Receipt",
	...sizes.custom(96, 126, 104),
	enableResizing: false,
	enableHiding: false,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-10" },
		headerLabel: "Receipt",
		className: sizeClass(sizes.custom(96, 126, 104), "justify-end"),
		contentClassName: "justify-end",
	},
	cell: () => (
		<div className="flex justify-end">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				disabled
				aria-label="Receipt download unavailable"
			>
				<Icons.Download className="size-4" />
			</Button>
		</div>
	),
};

export const columns: Column[] = [
	paymentColumn,
	dateColumn,
	paidToColumn,
	amountColumn,
	receiptColumn,
];
