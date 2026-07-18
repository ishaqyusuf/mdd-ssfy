"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerTransactionRow =
	RouterOutputs["sales"]["getSaleTransactions"]["data"][number];

type Column = ColumnDef<CustomerTransactionRow>;

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not set";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatCurrency(value?: number | null) {
	const amount = Math.abs(Number(value || 0));
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

export function getCustomerTransactionRowId(row: CustomerTransactionRow) {
	return String(row.id);
}

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "createdAt",
	...sizes.custom(150, 230, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		className: sizeClass(
			sizes.custom(150, 230, 170),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const amount = Number(row.original.amount || 0);

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={formatDate(row.original.createdAt)}
				/>
				<p
					className={cn(
						"truncate font-mono text-xs tabular-nums",
						amount < 0 ? "text-red-700/80" : "text-muted-foreground",
					)}
				>
					{amount < 0 ? `(${formatCurrency(amount)})` : formatCurrency(amount)}
				</p>
			</div>
		);
	},
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorKey: "description",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Description",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => {
		const transaction = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate uppercase"
					text={transaction.description || "Transaction"}
				/>
				<div className="flex min-w-0 items-center gap-2">
					<Badge variant="secondary" className="h-5 rounded-full text-[10px]">
						{transaction.paymentMethod || "method unknown"}
					</Badge>
					{transaction.checkNo ? (
						<span className="truncate font-mono text-xs text-muted-foreground">
							Check {transaction.checkNo}
						</span>
					) : null}
				</div>
			</div>
		);
	},
};

const ordersColumn: Column = {
	id: "orders",
	header: "Orders",
	accessorKey: "orderIds",
	...sizes.custom(150, 300, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Orders",
		className: sizeClass(sizes.custom(150, 300, 190)),
	},
	cell: ({ row }) => {
		const transaction = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-mono text-sm"
					text={transaction.orderIds || "Wallet activity"}
				/>
				{transaction.ordersCount > 1 ? (
					<Badge variant="outline" className="h-5 rounded-full text-[10px]">
						{transaction.ordersCount} invoices
					</Badge>
				) : null}
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => {
		const transaction = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<Badge variant="outline" className="h-5 rounded-full uppercase">
					{transaction.status || "unknown"}
				</Badge>
				{transaction.reason ? (
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={transaction.reason}
					/>
				) : null}
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(82, 110, 90),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "button", width: "w-14" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(82, 110, 90),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => <CustomerTransactionAction item={row.original} />,
};

function CustomerTransactionAction({ item }: { item: CustomerTransactionRow }) {
	const modal = useTransactionOverviewModal();

	return (
		<div className="relative z-10 flex justify-end">
			<Button
				type="button"
				size="icon-xs"
				variant="ghost"
				aria-label={`View transaction ${item.paymentNo || item.id}`}
				onClick={(event) => {
					event.stopPropagation();
					modal.viewTx(item.id);
				}}
			>
				<Icons.ReceiptText className="size-4" />
			</Button>
		</div>
	);
}

export const columns: Column[] = [
	dateColumn,
	descriptionColumn,
	ordersColumn,
	statusColumn,
	actionsColumn,
];
