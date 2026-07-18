"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesProductionRow =
	RouterOutputs["sales"]["productions"]["data"][number];

type Column = ColumnDef<SalesProductionRow>;

export function getSalesProductionRowId(item: SalesProductionRow) {
	return item.uuid || String(item.id);
}

const dueDateColumn: Column = {
	id: "dueDate",
	header: "Due Date",
	accessorFn: (row) => row.dueDateLabel || row.alert?.date,
	...sizes.custom(140, 200, 160),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Due Date",
		className: sizeClass(
			sizes.custom(140, 200, 160),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <DueDateCell item={row.original} />,
};

const orderColumn: Column = {
	id: "orderId",
	header: "Order #",
	accessorKey: "orderId",
	...sizes.custom(110, 170, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		className: sizeClass(sizes.custom(110, 170, 130)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
			<span className="truncate font-mono text-sm font-semibold uppercase">
				{row.original.orderId}
			</span>
			<SalesPriorityBadge priority={row.original.priority} />
		</div>
	),
};

const salesColumn: Column = {
	id: "sales",
	header: "Sales",
	accessorFn: (row) => row.customer,
	...sizes.custom(190, 340, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Sales",
		className: sizeClass(sizes.custom(190, 340, 240)),
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={item.customer || "Customer unavailable"}
				/>
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="truncate font-mono text-xs font-medium uppercase text-muted-foreground">
						{item.orderId}
					</span>
					<SalesPriorityBadge priority={item.priority} />
				</div>
			</div>
		);
	},
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorFn: (row) => row.customer,
	...sizes.custom(170, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(170, 320, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium uppercase"
			text={row.original.customer || "Customer unavailable"}
		/>
	),
};

const assignedToColumn: Column = {
	id: "assignedTo",
	header: "Assigned To",
	accessorKey: "assignedTo",
	...sizes.custom(130, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Assigned To",
		className: sizeClass(sizes.custom(130, 220, 160)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.assignedTo || "Unassigned"}
		/>
	),
};

const salesRepColumn: Column = {
	id: "salesRep",
	header: "Sales Rep",
	accessorKey: "salesRep",
	...sizes.custom(100, 180, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(100, 180, 120)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground uppercase"
			text={row.original.salesRep || "-"}
		/>
	),
};

const statusColumn: Column = {
	id: "productionStatus",
	header: "Status",
	accessorFn: (row) =>
		row.status?.production?.scoreStatus || row.status?.production?.status,
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => {
		const production = row.original.status?.production;

		return (
			<Progress>
				<Progress.Status badge>
					{production?.scoreStatus || production?.status || "Pending"}
				</Progress.Status>
			</Progress>
		);
	},
};

const progressColumn: Column = {
	id: "productionProgress",
	header: "Progress",
	accessorFn: (row) => row.status?.production?.score,
	...sizes.custom(100, 150, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Progress",
		className: sizeClass(sizes.custom(100, 150, 120)),
	},
	cell: ({ row }) => {
		const production = row.original.status?.production;

		return (
			<div className="max-w-[112px]">
				<Progress>
					<Progress.ProgressBar
						className="w-20"
						showPercent
						score={production?.score || 0}
						total={production?.total || 0}
					/>
				</Progress>
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(72, 96, 80),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(72, 96, 80),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

export const columns: Column[] = [
	dueDateColumn,
	assignedToColumn,
	customerColumn,
	orderColumn,
	salesRepColumn,
	statusColumn,
	progressColumn,
	actionsColumn,
];

export const workerColumns: Column[] = [
	dueDateColumn,
	salesColumn,
	salesRepColumn,
	statusColumn,
	progressColumn,
	actionsColumn,
];

function DueDateCell({ item }: { item: SalesProductionRow }) {
	const hasDueDate = Boolean(item.alert?.date);
	const alertDateString = (
		item.alert as { dateString?: string | null } | undefined
	)?.dateString;

	return (
		<div className="min-w-0 space-y-1">
			<p className="truncate text-sm font-medium">
				{hasDueDate
					? item.dueDateLabel || alertDateString || "Due date set"
					: "No due date"}
			</p>
			{item.completed ? null : (
				<p className="truncate text-xs font-semibold text-muted-foreground">
					{item.alert?.text || "Open"}
				</p>
			)}
		</div>
	);
}

function Actions({ item }: { item: SalesProductionRow }) {
	const produceable = !!item.stats?.prodCompleted?.total;
	const batchSales = useBatchSales();
	const isMobile = useIsMobile();

	return (
		<div className="relative z-10 flex items-center justify-end">
			<Menu
				triggerSize={isMobile ? "default" : "xs"}
				Trigger={
					<Button
						className={cn(isMobile || "size-7 p-0")}
						variant="ghost"
						onClick={(event) => event.stopPropagation()}
					>
						<Icons.MoreHoriz className="size-4" />
						<span className="sr-only">Production actions</span>
					</Button>
				}
			>
				<Menu.Item
					SubMenu={
						<>
							<Menu.Item
								disabled={!produceable}
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									batchSales.markAsProductionCompleted(item.id);
								}}
							>
								Production Complete
							</Menu.Item>
							<Menu.Item
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									batchSales.markAsFulfilled(item.id);
								}}
							>
								Fulfillment Complete
							</Menu.Item>
						</>
					}
				>
					Mark as
				</Menu.Item>
			</Menu>
		</div>
	);
}
