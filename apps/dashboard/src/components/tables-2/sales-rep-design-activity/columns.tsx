"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesRepDesignActivityRow = {
	id: string;
	customer: string;
	product: string;
	status: string;
	amount: string;
	commission: string;
	date: string;
};

type Column = ColumnDef<SalesRepDesignActivityRow>;

export function getSalesRepDesignActivityRowId(row: SalesRepDesignActivityRow) {
	return row.id;
}

const statusVariants = {
	Approved: "default",
	Pending: "secondary",
	Paid: "outline",
	Quote: "secondary",
} as const;

const orderColumn: Column = {
	id: "order",
	header: "Order",
	accessorKey: "id",
	...sizes.custom(112, 170, 132),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order",
		className: sizeClass(
			sizes.custom(112, 170, 132),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.id}
		/>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorKey: "customer",
	...sizes.custom(170, 300, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(170, 300, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate"
			text={row.original.customer}
		/>
	),
};

const productColumn: Column = {
	id: "product",
	header: "Product",
	accessorKey: "product",
	...sizes.custom(180, 340, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Product",
		className: sizeClass(sizes.custom(180, 340, 240)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.product}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(104, 140, 116),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(104, 140, 116)),
	},
	cell: ({ row }) => {
		const variant =
			statusVariants[row.original.status as keyof typeof statusVariants] ??
			"secondary";

		return (
			<Badge variant={variant} className="max-w-full truncate rounded-md">
				{row.original.status}
			</Badge>
		);
	},
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(108, 140, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(108, 140, 120), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-medium tabular-nums">
			{row.original.amount}
		</span>
	),
};

const commissionColumn: Column = {
	id: "commission",
	header: "Commission",
	accessorKey: "commission",
	...sizes.custom(112, 150, 126),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Commission",
		className: sizeClass(sizes.custom(112, 150, 126), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right text-muted-foreground tabular-nums">
			{row.original.commission}
		</span>
	),
};

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "date",
	...sizes.custom(92, 126, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Date",
		className: sizeClass(sizes.custom(92, 126, 104), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right text-muted-foreground">
			{row.original.date}
		</span>
	),
};

export const columns: Column[] = [
	orderColumn,
	customerColumn,
	productColumn,
	statusColumn,
	amountColumn,
	commissionColumn,
	dateColumn,
];
