"use client";

import UnitTaskProductionAction from "@/components/_v1/actions/unit-task-production-actions";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import type { IHomeTask } from "@/types/community";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";

export type UnitProductionRow =
	RouterOutputs["community"]["getUnitProductions"]["data"][number];

type Column = ColumnDef<UnitProductionRow>;

export function getUnitProductionRowId(item: UnitProductionRow) {
	return String(item.id);
}

function getStatusTone(item: UnitProductionRow) {
	if (item.overdue) return "bg-red-100 text-red-700";

	switch ((item.status || "").toLowerCase()) {
		case "completed":
			return "bg-emerald-100 text-emerald-700";
		case "started":
			return "bg-amber-100 text-amber-700";
		case "queued":
			return "bg-sky-100 text-sky-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
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
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
		/>
	),
};

const dueDateColumn: Column = {
	id: "dueDate",
	header: "# / Due Date",
	accessorFn: (row) => row.productionDueDate,
	size: 170,
	minSize: 150,
	maxSize: 220,
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "# / Due Date",
		sortField: "dueDate",
		className:
			"w-[170px] min-w-[150px] md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<p className="font-mono text-sm font-semibold">#{item.id}</p>
				<p className="truncate text-xs text-muted-foreground">
					{item.productionDueDate
						? formatDate(item.productionDueDate)
						: "No due date"}
				</p>
			</div>
		);
	},
};

const taskColumn: Column = {
	id: "task",
	header: "Task",
	accessorFn: (row) => row.taskName,
	size: 260,
	minSize: 220,
	maxSize: 380,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Task",
		sortField: "task",
		className: "w-[260px] min-w-[220px]",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={item.taskName || "Untitled task"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{item.productionStatus || "Awaiting production activity"}
				</p>
			</div>
		);
	},
};

const unitColumn: Column = {
	id: "unit",
	header: "Unit",
	accessorFn: (row) => row.home?.lotBlock,
	size: 240,
	minSize: 190,
	maxSize: 340,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Unit",
		sortField: "unit",
		className: "w-[240px] min-w-[190px]",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-semibold"
					text={item.home?.lotBlock || "No lot/block"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={item.home?.modelName || "No model"}
				/>
			</div>
		);
	},
};

const projectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.project?.title,
	size: 260,
	minSize: 210,
	maxSize: 380,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Project",
		sortField: "project",
		className: "w-[260px] min-w-[210px]",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={item.project?.title || "No project"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{item.home?.lotBlock || "No lot/block"} ·{" "}
					{item.home?.modelName || "No model"}
				</p>
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => row.status,
	size: 180,
	minSize: 150,
	maxSize: 240,
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: "w-[180px] min-w-[150px]",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="w-full max-w-[160px]">
				<Progress>
					<Progress.Status>{item.status}</Progress.Status>
				</Progress>
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{item.jobCount > 0
						? `${item.jobCount} installation submission${
								item.jobCount > 1 ? "s" : ""
							}`
						: item.productionStatus || "Awaiting production activity"}
				</p>
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	size: 124,
	minSize: 112,
	maxSize: 150,
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-24" },
		className: "w-[124px] min-w-[112px]",
	},
	cell: ({ row }) => (
		<div className="relative z-10 flex items-center justify-end gap-2">
			<UnitTaskProductionAction task={row.original as unknown as IHomeTask} />
		</div>
	),
};

export const columns: Column[] = [
	selectColumn,
	dueDateColumn,
	taskColumn,
	unitColumn,
	projectColumn,
	statusColumn,
	actionsColumn,
];

export const projectTabColumns: Column[] = [
	dueDateColumn,
	taskColumn,
	unitColumn,
	projectColumn,
	statusColumn,
	actionsColumn,
];

export function UnitProductionCard({ item }: { item: UnitProductionRow }) {
	const { setParams } = useUnitProductionParams();

	return (
		<div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start gap-3">
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={() => {
						setParams({
							openUnitProductionId: item.id,
						});
					}}
				>
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-amber-50 p-2 text-amber-700">
							<Icons.Factory className="size-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-base font-semibold text-slate-900">
								{item.taskName || "Untitled task"}
							</p>
							<p className="truncate text-sm text-slate-600">
								{item.home?.lotBlock || "No lot/block"} ·{" "}
								{item.home?.modelName || "No model"}
							</p>
							<p className="truncate text-xs text-slate-500">
								{item.project?.title || "No project"}
							</p>
						</div>
					</div>
				</button>
				<div className="shrink-0">
					<UnitTaskProductionAction task={item as unknown as IHomeTask} />
				</div>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-md border border-slate-200 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						# / Due date
					</p>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						#{item.id}
					</p>
					<p className="mt-1 text-sm text-slate-700">
						{item.productionDueDate
							? formatDate(item.productionDueDate)
							: "Not set"}
					</p>
				</div>
				<div className="rounded-md border border-slate-200 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Project
					</p>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						{item.project?.title || "No project"}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{item.home?.lotBlock || "No lot/block"} ·{" "}
						{item.home?.modelName || "No model"}
					</p>
				</div>
			</div>

			<div className="mt-3 rounded-md border border-slate-200 px-3 py-3">
				<p className="text-xs font-semibold uppercase text-muted-foreground">
					Status
				</p>
				<span
					className={cn(
						"mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
						getStatusTone(item),
					)}
				>
					{item.overdue ? `${item.status} · Past due` : item.status}
				</span>
				<p className="mt-2 text-xs text-muted-foreground">
					{item.jobCount > 0
						? `${item.jobCount} installation submission${
								item.jobCount > 1 ? "s" : ""
							}`
						: item.productionStatus || "Awaiting production activity"}
				</p>
			</div>

			<Button
				type="button"
				className="mt-4 w-full"
				variant="outline"
				onClick={() => {
					setParams({
						openUnitProductionId: item.id,
					});
				}}
			>
				Open Task Context
			</Button>
		</div>
	);
}
