"use client";

import UnitTaskProductionAction from "@/components/_v1/actions/unit-task-production-actions";
import type { IHomeTask } from "@/types/community";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Checkbox } from "@gnd/ui/checkbox";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";

export type UnitProductionRow =
	RouterOutputs["community"]["getUnitProductions"]["data"][number];

type Column = ColumnDef<UnitProductionRow>;

export function getUnitProductionRowId(item: UnitProductionRow) {
	return String(item.id);
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
