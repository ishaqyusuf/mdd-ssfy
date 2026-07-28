"use client";

import Money from "@/components/_v1/money";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type JobScopeRow = {
	id: string;
	title: string;
	rate: number;
	qty: number;
	maxQty: number | null;
	total: number;
};

type Column = ColumnDef<JobScopeRow>;

export function getJobScopeRowId(row: JobScopeRow) {
	return row.id;
}

const taskColumn: Column = {
	id: "task",
	header: "Task / Item",
	accessorKey: "title",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Task / Item",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-xs font-semibold uppercase text-foreground"
			text={row.original.title || "-"}
		/>
	),
};

const rateColumn: Column = {
	id: "rate",
	header: "Rate",
	accessorKey: "rate",
	...sizes.custom(84, 124, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Rate",
		className: sizeClass(sizes.custom(84, 124, 96)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-xs font-medium tabular-nums text-muted-foreground">
			<Money value={row.original.rate} />
		</span>
	),
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	accessorKey: "qty",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-12" },
		headerLabel: "Qty",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<Badge variant="secondary" className="max-w-full truncate font-medium">
			{row.original.qty}
			{row.original.maxQty ? (
				<span className="ml-1 font-normal text-muted-foreground">
					/ {row.original.maxQty}
				</span>
			) : null}
		</Badge>
	),
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	accessorKey: "total",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Total",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-xs font-semibold tabular-nums">
			<Money value={row.original.total} />
		</span>
	),
};

export const columns: Column[] = [
	taskColumn,
	rateColumn,
	qtyColumn,
	totalColumn,
];
