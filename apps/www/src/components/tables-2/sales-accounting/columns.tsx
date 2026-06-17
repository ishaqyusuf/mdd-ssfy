"use client";

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
	size: 50,
	minSize: 50,
	maxSize: 50,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className:
			"w-[50px] min-w-[50px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
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
	size: 150,
	minSize: 130,
	maxSize: 210,
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		className:
			"w-[150px] min-w-[130px] md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
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
	size: 140,
	minSize: 120,
	maxSize: 190,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Amount",
		className: "w-[140px] min-w-[120px]",
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
	size: 300,
	minSize: 220,
	maxSize: 460,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Description",
		className: "w-[300px] min-w-[220px]",
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
	size: 220,
	minSize: 170,
	maxSize: 320,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Order #",
		className: "w-[220px] min-w-[170px]",
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
	size: 220,
	minSize: 160,
	maxSize: 320,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Sales Rep",
		className: "w-[220px] min-w-[160px]",
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
	size: 190,
	minSize: 150,
	maxSize: 260,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Processed By",
		className: "w-[190px] min-w-[150px]",
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
	size: 210,
	minSize: 160,
	maxSize: 280,
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Payment Status",
		className: "w-[210px] min-w-[160px]",
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
	size: 130,
	minSize: 110,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Sub Total",
		className: "w-[130px] min-w-[110px]",
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
	size: 120,
	minSize: 100,
	maxSize: 170,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Labor",
		className: "w-[120px] min-w-[100px]",
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
	size: 120,
	minSize: 100,
	maxSize: 170,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Delivery",
		className: "w-[120px] min-w-[100px]",
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
	size: 92,
	minSize: 92,
	maxSize: 92,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className:
			"w-[92px] min-w-[92px] md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
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
