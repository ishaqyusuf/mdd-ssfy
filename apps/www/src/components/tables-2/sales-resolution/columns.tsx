"use client";

import { salesResolveUpdatePaymentAction } from "@/actions/sales-resolve-update-payment";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import type { ColumnDef } from "@tanstack/react-table";
import { useAction } from "next-safe-action/hooks";
import Money from "../../_v1/money";

export type SalesResolutionRow =
	RouterOutputs["sales"]["getSalesResolutions"]["data"][number];

type Column = ColumnDef<SalesResolutionRow>;

export type SalesResolutionTableActions = {
	onOpenDetails: (row: SalesResolutionRow) => void;
	selectedIds: number[];
};

export function getSalesResolutionRowId(row: SalesResolutionRow) {
	return String(row.id);
}

export function hasDueMismatch(item: SalesResolutionRow) {
	return Number(item.due || 0) !== Number(item.calculatedDue || 0);
}

export function getRecommendedResolutionAction(item: SalesResolutionRow) {
	if (item.status === "overpayment") {
		return "Review refund or wallet credit";
	}
	if (item.status === "duplicate payments") {
		return "Cancel duplicate payment";
	}
	if (hasDueMismatch(item)) {
		return "Sync due amount";
	}
	return "Monitor account";
}

function customerName(row: SalesResolutionRow) {
	return row.customer?.businessName || row.customer?.name || "Customer";
}

function formatPaymentDate(value?: Date | string | null) {
	if (!value) return "No payment date";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "No payment date";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function OrderCell({ row }: { row: SalesResolutionRow }) {
	const salesOverview = useSalesOverviewQuery();

	return (
		<div className="min-w-0 space-y-0.5">
			<Button
				size="xs"
				variant="secondary"
				className="max-w-full justify-start px-1.5 font-mono uppercase"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					salesOverview.open2(row.orderId, "sales");
				}}
			>
				<span className="truncate">#{row.orderId}</span>
			</Button>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.orderDate || "No order date"}
			/>
		</div>
	);
}

function CustomerCell({ row }: { row: SalesResolutionRow }) {
	const customerQuery = useCustomerOverviewQuery();
	const label = customerName(row);

	return (
		<div className="min-w-0 space-y-0.5">
			<Button
				size="xs"
				variant="ghost"
				disabled={!row.accountNo}
				className="max-w-full justify-start px-1.5 font-medium uppercase"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					customerQuery.open(row.accountNo);
				}}
			>
				<span className="truncate">{label}</span>
			</Button>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.accountNo || "No account number"}
			/>
		</div>
	);
}

function StatusCell({ row }: { row: SalesResolutionRow }) {
	const dueMismatch = hasDueMismatch(row);
	const recommendedAction = getRecommendedResolutionAction(row);

	return (
		<div className="min-w-0 space-y-1">
			<div className="flex min-w-0 items-center gap-1.5">
				{row.status ? (
					<Badge variant="outline" className="max-w-full capitalize">
						<span className="truncate">{row.status}</span>
					</Badge>
				) : (
					<Badge variant="secondary">No conflict</Badge>
				)}
				{dueMismatch ? (
					<Badge
						variant="secondary"
						className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
					>
						Due
					</Badge>
				) : null}
			</div>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={recommendedAction}
			/>
		</div>
	);
}

function AmountsCell({ row }: { row: SalesResolutionRow }) {
	return (
		<div className="grid min-w-0 grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
			<span className="text-muted-foreground">Total</span>
			<span className="truncate text-right font-medium tabular-nums">
				<Money value={row.total} />
			</span>
			<span className="text-muted-foreground">Paid</span>
			<span className="truncate text-right font-medium text-green-600 tabular-nums">
				<Money value={row.paid} />
			</span>
		</div>
	);
}

function DueCell({ row }: { row: SalesResolutionRow }) {
	const mismatch = hasDueMismatch(row);

	return (
		<div className="grid min-w-0 grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
			<span className="text-muted-foreground">Stored</span>
			<span
				className={cn(
					"truncate text-right font-medium tabular-nums",
					row.due > 0 ? "text-red-600" : "text-green-600",
				)}
			>
				<Money value={row.due} />
			</span>
			<span className="text-muted-foreground">Projected</span>
			<span
				className={cn(
					"truncate text-right font-medium tabular-nums",
					mismatch ? "text-amber-600" : "text-green-600",
				)}
			>
				<Money value={row.calculatedDue} />
			</span>
		</div>
	);
}

function SyncDueButton({ row }: { row: SalesResolutionRow }) {
	const rcp = useResolutionCenterParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const dueMismatch = hasDueMismatch(row);
	const updatePayment = useAction(salesResolveUpdatePaymentAction, {
		onSuccess() {
			rcp.setParams({
				refreshToken: generateRandomString(),
			});
			void queryClient.invalidateQueries({
				queryKey: trpc.sales.getSalesResolutions.queryKey(),
			});
			void queryClient.invalidateQueries({
				queryKey: trpc.sales.getSalesResolutionsSummary.queryKey(),
			});
		},
	});

	if (!dueMismatch) {
		return null;
	}

	return (
		<Button
			size="xs"
			variant="outline"
			disabled={updatePayment.isExecuting}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				updatePayment.execute({
					salesId: row.id,
				});
			}}
		>
			<Icons.pendingPayment className="size-3" />
			Sync
		</Button>
	);
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
			aria-label={`Select resolution case ${row.original.orderId}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
			onClick={(event) => event.stopPropagation()}
		/>
	),
};

const orderColumn: Column = {
	id: "orderId",
	header: "Order",
	accessorKey: "orderId",
	...sizes.custom(132, 220, 154),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Order",
		sortField: "orderId",
		className: sizeClass(
			sizes.custom(132, 220, 154),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <OrderCell row={row.original} />,
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	...sizes.custom(180, 340, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(180, 340, 220)),
	},
	cell: ({ row }) => <CustomerCell row={row.original} />,
};

const statusColumn: Column = {
	id: "status",
	header: "Issue",
	accessorKey: "status",
	...sizes.custom(140, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Issue",
		className: sizeClass(sizes.custom(140, 240, 170)),
	},
	cell: ({ row }) => <StatusCell row={row.original} />,
};

const amountsColumn: Column = {
	id: "amounts",
	header: "Amounts",
	...sizes.custom(124, 180, 144),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Amounts",
		sortField: "grandTotal",
		className: sizeClass(sizes.custom(124, 180, 144), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => <AmountsCell row={row.original} />,
};

const dueColumn: Column = {
	id: "due",
	header: "Due",
	accessorKey: "due",
	...sizes.custom(124, 180, 144),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Due",
		sortField: "amountDue",
		className: sizeClass(sizes.custom(124, 180, 144), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => <DueCell row={row.original} />,
};

const paymentsColumn: Column = {
	id: "payments",
	header: "Payments",
	accessorKey: "paymentCount",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Payments",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<div className="truncate font-medium">
				{row.original.paymentCount} payment
				{row.original.paymentCount !== 1 ? "s" : ""}
			</div>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={formatPaymentDate(row.original.date)}
			/>
		</div>
	),
};

const salesRepColumn: Column = {
	id: "salesRep",
	header: "Sales Rep",
	accessorKey: "salesRep",
	...sizes.custom(96, 150, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(96, 150, 112)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate"
			text={row.original.salesRep || "No rep"}
		/>
	),
};

const actionsColumn: (actions: SalesResolutionTableActions) => Column = (
	actions,
) => ({
	id: "actions",
	header: "Actions",
	...sizes.custom(124, 170, 136),
	enableResizing: false,
	enableHiding: false,
	meta: {
		skeleton: { type: "actions" },
		className: sizeClass(sizes.custom(124, 170, 136)),
		contentClassName: "flex items-center justify-end gap-1.5",
	},
	cell: ({ row }) => {
		const isOpen = actions.selectedIds.includes(row.original.id);

		return (
			<div className="flex min-w-0 items-center justify-end gap-1.5">
				<Button
					size="xs"
					variant={isOpen ? "default" : "secondary"}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						actions.onOpenDetails(row.original);
					}}
				>
					{isOpen ? "Open" : "Review"}
				</Button>
				<SyncDueButton row={row.original} />
			</div>
		);
	},
});

export function getSalesResolutionColumns(
	actions: SalesResolutionTableActions,
): Column[] {
	return [
		selectColumn,
		orderColumn,
		customerColumn,
		statusColumn,
		amountsColumn,
		dueColumn,
		paymentsColumn,
		salesRepColumn,
		actionsColumn(actions),
	];
}

export const columns = getSalesResolutionColumns({
	onOpenDetails: () => undefined,
	selectedIds: [],
});
