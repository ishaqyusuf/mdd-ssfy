"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useSalesAccountingParams } from "@/hooks/use-sales-accounting-params";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesAccountingRow =
	RouterOutputs["sales"]["getSalesAccountings"]["data"][number];

export type Item = SalesAccountingRow;

type Column = ColumnDef<SalesAccountingRow>;
type MoneyValue = number | string | null | undefined;

export function getSalesAccountingRowId(row: SalesAccountingRow) {
	return String(row.id ?? row.uuid ?? row.paymentNo);
}

function toMoneyNumber(value: MoneyValue) {
	if (typeof value === "number") return value;
	if (typeof value !== "string") return 0;

	const normalized = value.replace(/[^0-9.-]/g, "");
	const parsed = Number(normalized);

	return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyValue(value: MoneyValue, negativeStyle = false) {
	const amount = toMoneyNumber(value);
	const formatted = formatCurrency.format(Math.abs(amount));

	if (negativeStyle && amount < 0) {
		return `(${formatted})`;
	}

	return amount < 0 ? `-${formatted}` : formatted;
}

function formatDate(value: unknown) {
	if (!value) return "Not set";

	const date = new Date(value as string | number | Date);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getPaymentLabel(item: SalesAccountingRow) {
	return [item.paymentMethod, item.checkNo].filter(Boolean).join(" | ") || "-";
}

function getStatusLabel(item: SalesAccountingRow) {
	return [item.status, item.reason].filter(Boolean).join(" | ") || "-";
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			aria-label={`Select accounting record ${row.original.paymentNo}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
			onClick={(event) => {
				event.stopPropagation();
			}}
		/>
	),
};

const dateColumn: Column = {
	id: "createdAt",
	header: "Date",
	accessorKey: "createdAt",
	...sizes.custom(130, 210, 150),
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		className: sizeClass(
			sizes.custom(130, 210, 150),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<span className="truncate font-medium">
				{formatDate(row.original.createdAt)}
			</span>
			<span className="block truncate font-mono text-xs text-muted-foreground">
				#{row.original.paymentNo || row.original.id}
			</span>
		</div>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => {
		const amount = toMoneyNumber(row.original.amount);

		return (
			<span
				className={cn(
					"truncate font-mono text-sm font-medium",
					amount < 0 && "text-red-700/80",
				)}
			>
				{formatMoneyValue(row.original.amount, true)}
			</span>
		);
	},
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorKey: "description",
	...sizes.custom(220, 460, 300),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Description",
		className: sizeClass(sizes.custom(220, 460, 300)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-medium uppercase"
				text={row.original.description || "No description"}
			/>
			<Progress>
				<Progress.Status>{getPaymentLabel(row.original)}</Progress.Status>
			</Progress>
		</div>
	),
};

const orderColumn: Column = {
	id: "orderIds",
	header: "Order #",
	accessorKey: "orderIds",
	...sizes.custom(170, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Order #",
		className: sizeClass(sizes.custom(170, 320, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-mono text-sm uppercase"
				text={row.original.orderIds || "Wallet activity"}
			/>
			{row.original.ordersCount > 1 ? (
				<Badge
					variant="outline"
					className="h-5 rounded-full px-1.5 text-[10px]"
				>
					{row.original.ordersCount} invoices
				</Badge>
			) : null}
		</div>
	),
};

const salesRepColumn: Column = {
	id: "salesReps",
	header: "Sales Rep",
	accessorFn: (row) => row.salesReps?.join(", "),
	...sizes.custom(160, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(160, 320, 220)),
	},
	cell: ({ row }) => {
		const reps = row.original.salesReps?.filter(Boolean) ?? [];

		return reps.length ? (
			<div className="min-w-0 space-y-1">
				{reps.map((rep) => (
					<TextWithTooltip
						key={rep}
						className="max-w-full truncate text-muted-foreground"
						text={rep}
					/>
				))}
			</div>
		) : (
			<span className="text-muted-foreground">Unassigned</span>
		);
	},
};

const processedByColumn: Column = {
	id: "processedBy",
	header: "Processed By",
	accessorKey: "authorName",
	...sizes.custom(150, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Processed By",
		className: sizeClass(sizes.custom(150, 260, 190)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.authorName || "Unknown"}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Payment Status",
	accessorKey: "status",
	...sizes.custom(160, 280, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Payment Status",
		className: sizeClass(sizes.custom(160, 280, 210)),
	},
	cell: ({ row }) => (
		<Progress>
			<Progress.Status>{getStatusLabel(row.original)}</Progress.Status>
		</Progress>
	),
};

const subTotalColumn: Column = {
	id: "subTotal",
	header: "Sub Total",
	accessorKey: "subTotal",
	...sizes.custom(110, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Sub Total",
		className: sizeClass(sizes.custom(110, 180, 130)),
	},
	cell: ({ row }) => (
		<span className="truncate font-mono text-sm text-muted-foreground">
			{formatMoneyValue(row.original.subTotal)}
		</span>
	),
};

const laborColumn: Column = {
	id: "labor",
	header: "Labor",
	accessorKey: "laborCost",
	...sizes.custom(100, 170, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Labor",
		className: sizeClass(sizes.custom(100, 170, 120)),
	},
	cell: ({ row }) => (
		<span className="truncate font-mono text-sm text-muted-foreground">
			{formatMoneyValue(row.original.laborCost)}
		</span>
	),
};

const deliveryColumn: Column = {
	id: "delivery",
	header: "Delivery",
	accessorKey: "deliveryCost",
	...sizes.custom(100, 170, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Delivery",
		className: sizeClass(sizes.custom(100, 170, 120)),
	},
	cell: ({ row }) => (
		<span className="truncate font-mono text-sm text-muted-foreground">
			{formatMoneyValue(row.original.deliveryCost)}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(92, 92),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(92, 92),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <SalesAccountingActions item={row.original} />,
};

export const columns: Column[] = [
	selectColumn,
	dateColumn,
	amountColumn,
	descriptionColumn,
	orderColumn,
	salesRepColumn,
	processedByColumn,
	statusColumn,
	subTotalColumn,
	laborColumn,
	deliveryColumn,
	actionsColumn,
];

function SalesAccountingActions({ item }: { item: SalesAccountingRow }) {
	const { setParams } = useSalesAccountingParams();

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
			aria-label={`Open accounting record ${item.paymentNo || item.id}`}
			title="Open accounting record"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				setParams({
					openSalesAccountingId: item.id,
				});
			}}
		>
			<Icons.ExternalLink className="size-4" />
			<span className="sr-only">Open accounting record</span>
		</Button>
	);
}
