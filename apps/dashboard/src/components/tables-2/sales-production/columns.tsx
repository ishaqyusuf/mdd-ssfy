"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { formatDate } from "@gnd/utils/dayjs";
import { getProductionDueDatePresentation } from "@sales/production-date";
import type { getSalesProductions } from "@sales/sales-production";
import type { ColumnDef } from "@tanstack/react-table";

import { getSalesProductionAssignedToLabel } from "./assigned-to-label";
import { getSalesProductionDueDateClassName } from "./due-date-tone";

export type SalesProductionRow = Awaited<
	ReturnType<typeof getSalesProductions>
>["data"][number];

type Column = ColumnDef<SalesProductionRow>;

export function getSalesProductionRowId(item: SalesProductionRow) {
	return item.uuid || String(item.id);
}

const selectColumn: Column = {
	id: "select",
	header: "Mark all",
	...sizes.xs,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.xs,
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			aria-label={`Select ${row.original.orderId}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				row.toggleSelected(checked === "indeterminate" ? undefined : checked);
			}}
		/>
	),
};

const dueDateColumn: Column = {
	id: "dueDate",
	header: "Due Date",
	accessorFn: (row) => row.dueDate || row.alert?.date,
	...sizes.custom(140, 200, 160),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Due Date",
		sortField: "dueDate",
		className: sizeClass(
			sizes.custom(140, 200, 160),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <DueDateCell item={row.original} />,
};

const orderDateColumn: Column = {
	id: "orderDate",
	header: "Order Date",
	accessorKey: "createdAt",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Order Date",
		sortField: "orderDate",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.createdAt ? formatDate(row.original.createdAt) : "-"}
		</span>
	),
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
			<div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
				<TextWithTooltip
					className="min-w-0 flex-1 truncate font-medium uppercase"
					text={item.customer || "Customer unavailable"}
				/>
				<span className="shrink-0 font-mono text-xs font-medium uppercase text-muted-foreground">
					{item.orderId}
				</span>
				<SalesPriorityBadge priority={item.priority} />
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
		<AssignedToBadge
			assignedTo={row.original.assignedTo}
			totalAssigned={row.original.totalAssigned}
		/>
	),
};

const assignedAtColumn: Column = {
	id: "assignedAt",
	header: "Assigned At",
	accessorKey: "assignedAt",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Assigned At",
		sortField: "assignedAt",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.assignedAt ? formatDate(row.original.assignedAt) : "-"}
		</span>
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

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorFn: (row) => row.invoice.total,
	...sizes.custom(150, 230, 180),
	enableResizing: true,
	enableSorting: false,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Invoice",
		className: sizeClass(sizes.custom(150, 230, 180), "text-right"),
	},
	cell: ({ row }) => {
		const invoice = row.original.invoice;
		const isPaid = invoice.status === "paid";
		const statusLabel =
			invoice.status === "unknown"
				? "Not set"
				: isPaid
					? "Paid"
					: "Outstanding";

		return (
			<div
				className="flex min-w-0 items-center justify-end gap-2"
				aria-label={`Invoice ${statusLabel}`}
			>
				<span className="truncate font-mono text-sm font-medium">
					{invoice.total == null ? "-" : formatCurrency.format(invoice.total)}
				</span>
				<Badge
					variant="outline"
					className={cn(
						"h-5 shrink-0 rounded-full px-1.5 text-[9px] font-semibold uppercase",
						isPaid
							? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: invoice.status === "outstanding"
								? "border-amber-200 bg-amber-50 text-amber-700"
								: "text-muted-foreground",
					)}
				>
					{statusLabel}
				</Badge>
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "productionStatus",
	header: "Status",
	accessorFn: (row) =>
		row.pipeline?.production.state ||
		row.status?.production?.workflow?.label ||
		row.status?.production?.status,
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => {
		const production = row.original.status?.production;
		const pipeline = row.original.pipeline;

		return (
			<Progress>
				<Progress.Status badge>
					{pipeline?.production.state
						?.replaceAll("_", " ")
						.replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
						production?.workflow?.label ||
						production?.status ||
						"Not assigned"}
				</Progress.Status>
			</Progress>
		);
	},
};

const materialsColumn: Column = {
	id: "materials",
	header: "Materials",
	accessorFn: (row) => row.materials.state,
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Materials",
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) => {
		const materials = row.original.materials;
		const isReady = materials.state === "ready";
		const label =
			materials.state === "unavailable"
				? "Materials unavailable"
				: materials.state === "not_configured"
					? "Materials not set"
					: isReady
						? "Materials ready"
						: "Materials pending";

		return (
			<p
				className={cn(
					"truncate text-sm font-medium",
					isReady ? "text-emerald-700" : "text-amber-700",
				)}
			>
				{label}
			</p>
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
	selectColumn,
	dueDateColumn,
	orderDateColumn,
	assignedToColumn,
	assignedAtColumn,
	customerColumn,
	orderColumn,
	invoiceColumn,
	salesRepColumn,
	materialsColumn,
	statusColumn,
	progressColumn,
	actionsColumn,
];

export const workerColumns: Column[] = [
	dueDateColumn,
	salesColumn,
	salesRepColumn,
	materialsColumn,
	statusColumn,
	progressColumn,
	actionsColumn,
];

function DueDateCell({ item }: { item: SalesProductionRow }) {
	const dueDate = item.dueDate || item.alert?.date;
	const presentation = getProductionDueDatePresentation(dueDate);

	return (
		<p
			className={cn(
				"min-w-0 truncate text-sm font-medium",
				getSalesProductionDueDateClassName(dueDate, item.completed),
			)}
		>
			{presentation.label}
		</p>
	);
}

function AssignedToBadge({
	assignedTo,
	totalAssigned,
}: {
	assignedTo?: string | null;
	totalAssigned?: number | null;
}) {
	const label = getSalesProductionAssignedToLabel({
		assignedTo,
		totalAssigned,
	});

	return (
		<Badge
			variant={assignedTo ? "secondary" : "outline"}
			className="h-5 max-w-full rounded-full px-1.5 text-[10px]"
		>
			<span className="truncate">{label}</span>
		</Badge>
	);
}

function Actions({ item }: { item: SalesProductionRow }) {
	const isMobile = useIsMobile();

	return (
		<SalesMenu
			id={item.id}
			type="order"
			orderNo={item.orderId}
			align="end"
			trigger={
				<Button
					className={cn(isMobile || "size-7 p-0")}
					size={isMobile ? "default" : "xs"}
					variant="ghost"
					onClick={(event) => event.stopPropagation()}
				>
					<Icons.MoreHoriz className="size-4" />
					<span className="sr-only">Production actions</span>
				</Button>
			}
		>
			<SalesMenu.MarkAs
				asSubmenu={false}
				showUnavailableFulfilled
				currentStatus={item.lifecycleStatus}
				productionStatus={item.status?.production?.status}
				pipelineCapabilities={item.pipeline?.capabilities}
				statusCandidates={[
					{
						salesId: item.id,
						status: item.lifecycleStatus,
						productionCompleted: item.completed,
					},
				]}
			/>
		</SalesMenu>
	);
}
