"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerOverviewSalesPreviewType = "order" | "quote";

export type CustomerOverviewSalesPreviewRow = {
	id: number;
	orderId: string;
	uuid: string;
	displayName?: string | null;
	email?: string | null;
	salesDate?: string | null;
	due?: number | null;
	invoice: {
		total: number;
	};
	status?: {
		delivery?: {
			status?: string | null;
		};
	} | null;
};

type Column = ColumnDef<CustomerOverviewSalesPreviewRow>;

function getStatusLabel(
	row: CustomerOverviewSalesPreviewRow,
	type: CustomerOverviewSalesPreviewType,
) {
	if (type === "order") {
		return row.status?.delivery?.status || "Pending";
	}

	return Number(row.due || 0) > 0 ? "Pending" : "Ready";
}

type ColumnOptions = {
	type: CustomerOverviewSalesPreviewType;
	onOpenPage: (orderNo: string) => void;
	onOpenSheet: (orderNo: string) => void;
};

export function getCustomerOverviewSalesPreviewRowId(
	row: CustomerOverviewSalesPreviewRow,
	index?: number,
) {
	return String(
		row.id ?? row.orderId ?? `customer-overview-sale-${index ?? 0}`,
	);
}

export function createColumns({
	type,
	onOpenPage,
	onOpenSheet,
}: ColumnOptions): Column[] {
	const referenceColumn: Column = {
		id: "reference",
		header: "Reference",
		accessorKey: "orderId",
		...sizes.custom(150, 260, 180),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "text", width: "w-24" },
			headerLabel: "Reference",
			className: sizeClass(
				sizes.custom(150, 260, 180),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-mono font-semibold uppercase"
					text={row.original.orderId || "-"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={row.original.displayName || "-"}
				/>
			</div>
		),
	};

	const dateColumn: Column = {
		id: "date",
		header: "Date",
		accessorKey: "salesDate",
		...sizes.custom(104, 150, 118),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Date",
			className: sizeClass(sizes.custom(104, 150, 118)),
		},
		cell: ({ row }) => (
			<span className="truncate text-sm text-muted-foreground">
				{row.original.salesDate ? formatDate(row.original.salesDate) : "-"}
			</span>
		),
	};

	const amountColumn: Column = {
		id: "amount",
		header: "Amount",
		accessorFn: (row) => row.invoice.total,
		...sizes.custom(104, 150, 120),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Amount",
			className: sizeClass(sizes.custom(104, 150, 120), "text-right"),
			contentClassName: "justify-end text-right",
		},
		cell: ({ row }) => (
			<span className="block truncate text-right font-mono font-medium">
				${formatMoney(row.original.invoice.total)}
			</span>
		),
	};

	const statusColumn: Column = {
		id: "status",
		header: "Status",
		accessorFn: (row) => getStatusLabel(row, type),
		...sizes.custom(118, 180, 132),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Status",
			className: sizeClass(sizes.custom(118, 180, 132)),
		},
		cell: ({ row }) => (
			<Badge
				variant="outline"
				className="h-5 max-w-full rounded-full text-[10px]"
			>
				<span className="truncate">{getStatusLabel(row.original, type)}</span>
			</Badge>
		),
	};

	const actionsColumn: Column = {
		id: "actions",
		header: "Actions",
		...sizes.custom(168, 230, 190),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			skeleton: { type: "button", width: "w-28" },
			headerLabel: "Actions",
			className: sizeClass(
				sizes.custom(168, 230, 190),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => (
			<div className="relative z-10 flex justify-end gap-1.5">
				<Button
					size="sm"
					variant="outline"
					onClick={(event) => {
						event.stopPropagation();
						onOpenSheet(row.original.uuid);
					}}
				>
					Sheet
				</Button>
				<Button
					size="sm"
					onClick={(event) => {
						event.stopPropagation();
						onOpenPage(row.original.uuid);
					}}
				>
					Page
				</Button>
			</div>
		),
	};

	return [
		referenceColumn,
		dateColumn,
		amountColumn,
		statusColumn,
		actionsColumn,
	];
}

export const columns = createColumns({
	type: "order",
	onOpenPage: () => {},
	onOpenSheet: () => {},
});
