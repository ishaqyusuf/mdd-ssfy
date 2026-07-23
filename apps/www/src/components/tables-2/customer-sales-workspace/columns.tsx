"use client";

import { SalesMenu } from "@/components/sales-menu";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

type CustomerOverview = NonNullable<
	RouterOutputs["customers"]["getCustomerOverviewV2"]
>;
type CustomerSalesWorkspace = NonNullable<CustomerOverview["salesWorkspace"]>;
type CustomerSalesWorkspaceSourceRow =
	| CustomerSalesWorkspace["orders"][number]
	| CustomerSalesWorkspace["quotes"][number];

export type CustomerSalesWorkspaceRow = CustomerSalesWorkspaceSourceRow & {
	type: "order" | "quote";
};

export type CustomerSalesWorkspaceTableMeta = {
	selectedIds: number[];
	isAllRowsSelected: boolean;
	isSomeRowsSelected: boolean;
	onToggleAll: (checked: boolean) => void;
	onToggleRow: (item: CustomerSalesWorkspaceRow, checked: boolean) => void;
	onDeleted: (item: CustomerSalesWorkspaceRow) => void;
};

type Column = ColumnDef<CustomerSalesWorkspaceRow>;

function getMeta(table: unknown): CustomerSalesWorkspaceTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CustomerSalesWorkspaceTableMeta };
		}
	).options?.meta;
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function deliveryLabel(item: CustomerSalesWorkspaceRow) {
	if (item.type === "quote") return "Not applicable";
	return item.status?.delivery?.status || "Pending";
}

function deliveryTone(item: CustomerSalesWorkspaceRow) {
	if (item.type === "quote") return "muted";
	return item.status?.delivery?.status === "completed" ? "success" : "warn";
}

function paymentLabel(item: CustomerSalesWorkspaceRow) {
	const due = Number(item.due || 0);
	return due > 0 ? `Pending ${formatCurrency(due)}` : "Paid";
}

function paymentTone(item: CustomerSalesWorkspaceRow) {
	return Number(item.due || 0) > 0 ? "warn" : "success";
}

export function getCustomerSalesWorkspaceRowId(row: CustomerSalesWorkspaceRow) {
	return `${row.type}-${row.id}`;
}

const selectColumn: Column = {
	id: "select",
	header: "",
	...sizes.custom(50, 50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		headerLabel: "Selected",
		className: sizeClass(
			sizes.custom(50, 50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedIds.includes(row.original.id) ?? false;

		return (
			<Checkbox
				checked={selected}
				onCheckedChange={(checked) =>
					meta?.onToggleRow(row.original, checked === true)
				}
				aria-label={`Select ${row.original.orderId || row.original.id}`}
			/>
		);
	},
};

const orderColumn: Column = {
	id: "order",
	header: "Order #",
	accessorKey: "orderId",
	...sizes.custom(132, 220, 154),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		className: sizeClass(
			sizes.custom(132, 220, 154),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-1.5">
			<TextWithTooltip
				className="min-w-0 truncate font-mono text-sm font-medium uppercase"
				text={row.original.orderId || "-"}
			/>
			<span className="shrink-0 truncate text-xs text-muted-foreground">
				{row.original.salesDate || "-"}
			</span>
			<Icons.ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
		</div>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorKey: "displayName",
	...sizes.custom(170, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(170, 320, 220)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-1.5">
			<TextWithTooltip
				className="min-w-0 truncate font-medium"
				text={row.original.displayName || "-"}
			/>
			<span className="shrink truncate text-xs text-muted-foreground">
				{row.original.customerPhone || row.original.address || "-"}
			</span>
		</div>
	),
};

const typeColumn: Column = {
	id: "type",
	header: "Type",
	accessorKey: "type",
	...sizes.custom(78, 108, 86),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-16" },
		headerLabel: "Type",
		className: sizeClass(sizes.custom(78, 108, 86)),
	},
	cell: ({ row }) => (
		<Badge
			variant={row.original.type === "order" ? "default" : "secondary"}
			className="max-w-full truncate"
		>
			{row.original.type === "order" ? "Sales" : "Quote"}
		</Badge>
	),
};

const paymentColumn: Column = {
	id: "payment",
	header: "Payment",
	accessorKey: "due",
	...sizes.custom(128, 190, 148),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Payment",
		className: sizeClass(sizes.custom(128, 190, 148)),
	},
	cell: ({ row }) => (
		<StatusBadge
			tone={paymentTone(row.original)}
			label={paymentLabel(row.original)}
		/>
	),
};

const deliveryColumn: Column = {
	id: "delivery",
	header: "Delivery",
	accessorKey: "status.delivery.status",
	...sizes.custom(118, 180, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Delivery",
		className: sizeClass(sizes.custom(118, 180, 136)),
	},
	cell: ({ row }) => (
		<StatusBadge
			tone={deliveryTone(row.original)}
			label={deliveryLabel(row.original)}
		/>
	),
};

const valueColumn: Column = {
	id: "value",
	header: "Value",
	accessorKey: "invoice.total",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Value",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium tabular-nums">
			{formatCurrency(row.original.invoice.total)}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 80, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 80, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => (
		<CustomerSalesWorkspaceActions item={row.original} meta={getMeta(table)} />
	),
};

function StatusBadge({
	label,
	tone,
}: {
	label: string;
	tone: "success" | "warn" | "muted";
}) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"max-w-full truncate",
				tone === "success" &&
					"border-emerald-200 bg-emerald-50 text-emerald-700",
				tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
				tone === "muted" && "border-slate-200 bg-slate-50 text-slate-600",
			)}
		>
			{label}
		</Badge>
	);
}

function CustomerSalesWorkspaceActions({
	item,
	meta,
}: {
	item: CustomerSalesWorkspaceRow;
	meta?: CustomerSalesWorkspaceTableMeta;
}) {
	return (
		<SalesMenu
			id={item.id}
			slug={item.slug}
			type={item.type}
			customerEmail={item.email ?? null}
			customerPhone={item.customerPhone}
			customerName={item.displayName}
			trigger={
				<Button size="icon-sm" variant="ghost" aria-label="More sales actions">
					<Icons.MoreHoriz className="size-4" />
				</Button>
			}
		>
			<SalesMenu.Sub>
				<SalesMenu.SubTrigger>
					<Icons.Mail className="mr-2 size-4 text-muted-foreground/70" />
					Send email
				</SalesMenu.SubTrigger>
				<SalesMenu.SubContent>
					{item.type === "quote" ? (
						<SalesMenu.QuoteEmailMenuItems />
					) : (
						<SalesMenu.SalesEmailMenuItems />
					)}
				</SalesMenu.SubContent>
			</SalesMenu.Sub>
			<SalesMenu.Delete onDeleted={() => meta?.onDeleted(item)} />
		</SalesMenu>
	);
}

export const columns: Column[] = [
	selectColumn,
	orderColumn,
	customerColumn,
	typeColumn,
	paymentColumn,
	deliveryColumn,
	valueColumn,
	actionsColumn,
];
