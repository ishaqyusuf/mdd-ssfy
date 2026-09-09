"use client";

import {
	ProductionAttentionButton,
	ProductionAttentionTooltip,
} from "@/components/sales-production/order-attention";
import { SalesMenu } from "@/components/sales-menu";
import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SalesOrderInvoiceCell } from "@/components/tables-2/sales-orders/order-finance-status-cells";
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
import { getSalesProductionSchedulePresentation } from "./schedule-presentation";

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

const scheduleColumn: Column = {
	...dueDateColumn,
	header: "Schedule",
	meta: { ...dueDateColumn.meta, headerLabel: "Schedule" },
	cell: ({ row }) => <ScheduleCell item={row.original} />,
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
				<ProductionAttentionButton
					presentation={item.orderPresentation}
					orderNo={item.orderId}
					customer={item.customer}
				/>
				<SalesPriorityBadge priority={item.priority} />
			</div>
		);
	},
};

const customerColumn: Column = {
	id: "customer",
	header: "Order / Customer",
	accessorFn: (row) => row.customer,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Order / Customer",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-col gap-1">
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="truncate font-mono text-sm font-semibold">
					{row.original.orderId}
				</span>
				<ProductionAttentionButton
					presentation={row.original.orderPresentation}
					orderNo={row.original.orderId}
					customer={row.original.customer}
				/>
				<SalesPriorityBadge priority={row.original.priority} />
			</div>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.customer || "Customer unavailable"}
			/>
		</div>
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
	accessorFn: (row) => row.invoicePresentation?.invoiceTotal,
	...sizes.custom(110, 180, 124),
	enableResizing: true,
	enableSorting: false,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Invoice",
		className: sizeClass(sizes.custom(110, 180, 124), "text-right"),
	},
	cell: ({ row }) =>
		row.original.invoicePresentation ? (
			<SalesOrderInvoiceCell item={row.original.invoicePresentation} />
		) : (
			<span className="text-muted-foreground">—</span>
		),
};

const statusColumn: Column = {
	id: "productionStatus",
	header: "Status",
	accessorFn: (row) => row.orderPresentation.primary.label,
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => (
		<ProductionAttentionTooltip
			presentation={row.original.orderPresentation}
			orderNo={row.original.orderId}
			customer={row.original.customer}
		>
			<div
				tabIndex={0}
				className="flex min-h-8 w-full items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Badge variant="outline" className="whitespace-normal">
					{row.original.orderPresentation.primary.label}
					{row.original.orderPresentation.primary.code === "in_production" && row.original.orderPresentation.primary.detail ? ` · ${row.original.orderPresentation.primary.detail}` : ""}
				</Badge>
			</div>
		</ProductionAttentionTooltip>
	),
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
	scheduleColumn,
	orderDateColumn,
	assignedToColumn,
	assignedAtColumn,
	customerColumn,
	invoiceColumn,
	salesRepColumn,
	statusColumn,
	progressColumn,
	actionsColumn,
];

export const workerColumns: Column[] = [
	dueDateColumn,
	{
		...salesColumn,
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="font-mono font-medium">{row.original.orderId}</p>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.customer}
				</p>
			</div>
		),
	},
	salesRepColumn,
	{
		...statusColumn,
		cell: ({ row }) => (
			<Badge variant="outline">
				{row.original.orderPresentation.primary.label}
					{row.original.orderPresentation.primary.code === "in_production" && row.original.orderPresentation.primary.detail ? ` · ${row.original.orderPresentation.primary.detail}` : ""}
			</Badge>
		),
	},
	{
  ...progressColumn,
  accessorFn: row => row.orderPresentation.reportedQty,
  cell: ({row}) => <div className="max-w-[112px]" aria-label={`${row.original.orderPresentation.reportedQty} submitted`}>
   <Progress><Progress.ProgressBar className="w-20" score={row.original.orderPresentation.reportedQty} total={row.original.status?.production?.total || 0}/></Progress>
  </div>,
 },
	actionsColumn,
];

export function ScheduleCell({ item }: { item: SalesProductionRow }) {
	const dueDate = item.dueDate || item.alert?.date;
	const presentation = getSalesProductionSchedulePresentation(dueDate);
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span
				className={cn(
					"truncate font-medium",
					getSalesProductionDueDateClassName(dueDate, item.completed),
				)}
			>
				{presentation.date}
			</span>
			<span className="truncate text-xs text-muted-foreground">
				{presentation.label}
			</span>
		</div>
	);
}

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
				pipeline={item.pipeline}
				statusCandidates={[
					{
						salesId: item.id,
						status: item.lifecycleStatus,
						pipelineRevision: item.pipeline?.revision,
						pipeline: item.pipeline,
						productionCompleted: item.completed,
					},
				]}
			/>
		</SalesMenu>
	);
}
