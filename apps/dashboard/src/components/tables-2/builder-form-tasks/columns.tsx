"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { BuilderFormSchema } from "@community/schema";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { CheckboxField } from "@gnd/ui/controls-2/checkbox-field";
import { InputField } from "@gnd/ui/controls-2/input-field";
import type { ColumnDef } from "@tanstack/react-table";
import type { Control } from "react-hook-form";

export type BuilderFormTaskRow = {
	fieldId: string;
	index: number;
	taskId: number | null;
};

type BuilderTaskFieldKey =
	| "taskName"
	| "addonPercentage"
	| "billable"
	| "installable"
	| "productionable";
type BuilderTaskFieldName = `tasks.${number}.${BuilderTaskFieldKey}`;

export type BuilderFormTasksTableMeta = {
	control: Control<BuilderFormSchema>;
	onRemoveTask: (index: number) => void;
};

type Column = ColumnDef<BuilderFormTaskRow>;

function getMeta(table: unknown): BuilderFormTasksTableMeta | undefined {
	return (
		table as {
			options?: { meta?: BuilderFormTasksTableMeta };
		}
	).options?.meta;
}

function taskFieldName(
	index: number,
	field: BuilderTaskFieldKey,
): BuilderTaskFieldName {
	return `tasks.${index}.${field}`;
}

export function getBuilderFormTaskRowId(row: BuilderFormTaskRow) {
	return row.fieldId || `builder-form-task-${row.index}`;
}

const taskColumn: Column = {
	id: "task",
	header: "Task Name",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Task Name",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<InputField
				className="mx-0 w-full"
				control={meta?.control}
				name={taskFieldName(row.original.index, "taskName")}
				placeholder="Task name"
			/>
		);
	},
};

const addonColumn: Column = {
	id: "addon",
	header: "Addon %",
	...sizes.custom(96, 132, 108),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Addon %",
		className: sizeClass(sizes.custom(96, 132, 108)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<InputField
				className="mx-0 w-full"
				control={meta?.control}
				name={taskFieldName(row.original.index, "addonPercentage")}
				type="number"
				suffix="%"
			/>
		);
	},
};

function BooleanCell({
	row,
	table,
	field,
}: {
	row: { original: BuilderFormTaskRow };
	table: unknown;
	field: Extract<
		BuilderTaskFieldKey,
		"billable" | "installable" | "productionable"
	>;
}) {
	const meta = getMeta(table);

	return (
		<div className="flex justify-center">
			<CheckboxField
				control={meta?.control}
				name={taskFieldName(row.original.index, field)}
			/>
		</div>
	);
}

const billableColumn: Column = {
	id: "billable",
	header: "Billable",
	...sizes.custom(84, 112, 92),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Billable",
		className: sizeClass(sizes.custom(84, 112, 92), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => (
		<BooleanCell row={row} table={table} field="billable" />
	),
};

const installableColumn: Column = {
	id: "installable",
	header: "Job",
	...sizes.custom(72, 96, 80),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Job",
		className: sizeClass(sizes.custom(72, 96, 80), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => (
		<BooleanCell row={row} table={table} field="installable" />
	),
};

const productionableColumn: Column = {
	id: "productionable",
	header: "Productionable",
	...sizes.custom(112, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Productionable",
		className: sizeClass(sizes.custom(112, 150, 124), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => (
		<BooleanCell row={row} table={table} field="productionable" />
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(64, 80, 72),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-8" },
		className: sizeClass(
			sizes.custom(64, 80, 72),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<div className="flex justify-end">
				<ConfirmBtn
					trash
					size="icon"
					onClick={() => meta?.onRemoveTask(row.original.index)}
				/>
			</div>
		);
	},
};

export const columns: Column[] = [
	taskColumn,
	addonColumn,
	billableColumn,
	installableColumn,
	productionableColumn,
	actionsColumn,
];
