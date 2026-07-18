"use client";

import Money from "@/components/_v1/money";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type LegacySquarePaymentOrderRow = {
	id: number | string;
	orderNo?: string | null;
	customerName?: string | null;
	amountDue: number;
};

type Column = ColumnDef<LegacySquarePaymentOrderRow>;

export function getLegacySquarePaymentOrderRowId(
	row: LegacySquarePaymentOrderRow,
) {
	return String(row.id);
}

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorKey: "orderNo",
	...sizes.custom(112, 160, 128),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Invoice",
		className: sizeClass(
			sizes.custom(112, 160, 128),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.orderNo || "-"}
		/>
	),
};

const billingColumn: Column = {
	id: "billing",
	header: "Billing",
	accessorKey: "customerName",
	...sizes.custom(170, 260, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Billing",
		className: sizeClass(sizes.custom(170, 260, 210)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={row.original.customerName || "-"}
		/>
	),
};

const dueColumn: Column = {
	id: "due",
	header: "Due",
	accessorKey: "amountDue",
	...sizes.custom(92, 128, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Due",
		className: sizeClass(sizes.custom(92, 128, 104)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate font-medium tabular-nums">
			<Money value={row.original.amountDue} />
		</span>
	),
};

export const columns: Column[] = [invoiceColumn, billingColumn, dueColumn];
