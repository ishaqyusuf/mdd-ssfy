"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerSalesListRow =
	RouterOutputs["sales"]["quotes"]["data"][number];

type Column = ColumnDef<CustomerSalesListRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getStatusLabel(row: CustomerSalesListRow) {
	if (row.isQuote) return "Quote";

	return row.orderStatus || row.inboundStatus || "Pending";
}

export function getCustomerSalesListRowId(
	row: CustomerSalesListRow,
	index?: number,
) {
	return String(row.id ?? row.orderId ?? `customer-sale-${index ?? 0}`);
}

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "salesDate",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Date",
		className: sizeClass(
			sizes.custom(112, 170, 128),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatDate(row.original.salesDate)}
		</span>
	),
};

const poColumn: Column = {
	id: "po",
	header: "P.O",
	accessorKey: "poNo",
	...sizes.custom(110, 180, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "P.O",
		className: sizeClass(sizes.custom(110, 180, 128)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-sm"
			text={row.original.poNo || "-"}
		/>
	),
};

const orderColumn: Column = {
	id: "order",
	header: "Order #",
	accessorKey: "orderId",
	...sizes.custom(132, 220, 154),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		className: sizeClass(sizes.custom(132, 220, 154)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-sm font-medium uppercase"
			text={row.original.orderId || "-"}
		/>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "invoice.total",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(112, 170, 128), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium tabular-nums">
			{formatCurrency(row.original.invoice?.total)}
		</span>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "orderStatus",
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="max-w-full truncate">
			{getStatusLabel(row.original)}
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 72, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 72, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: () => null,
};

export const columns: Column[] = [
	dateColumn,
	poColumn,
	orderColumn,
	amountColumn,
	statusColumn,
	actionsColumn,
];
