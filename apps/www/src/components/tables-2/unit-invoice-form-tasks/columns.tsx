"use client";

import FormDate from "@/components/common/controls/form-date";
import FormInput from "@/components/common/controls/form-input";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { saveUnitInvoiceFormSchema } from "@api/db/queries/unit-invoices";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import type { Control } from "react-hook-form";
import type { z } from "zod";

export type UnitInvoiceTaskRow = {
	fieldId: string;
	index: number;
	taskUid?: string | null;
};

type UnitInvoiceFormValues = z.infer<typeof saveUnitInvoiceFormSchema>;
type LockedInputProps = {
	readOnly?: boolean;
	className?: string;
};
type TaskFieldKey =
	| "taskName"
	| "amountDue"
	| "amountPaid"
	| "checkNo"
	| "checkDate"
	| "createdAt";
type TaskFieldName = `tasks.${number}.${TaskFieldKey}`;
type CheckedState = boolean | "indeterminate";

export type UnitInvoiceFormTasksTableMeta = {
	control: Control<UnitInvoiceFormValues>;
	lockedInputProps?: LockedInputProps;
	deletePending: boolean;
	syncCheckNo: boolean;
	syncCheckDate: boolean;
	firstCheckNo: string;
	firstCheckDate: Date | null;
	onApplyFirstCheckNoToAll: (checked: CheckedState) => void;
	onApplyFirstCheckDateToAll: (checked: CheckedState) => void;
	onDeleteTask: (index: number) => void | Promise<void>;
};

type Column = ColumnDef<UnitInvoiceTaskRow>;

function getMeta(table: unknown): UnitInvoiceFormTasksTableMeta | undefined {
	return (
		table as {
			options?: { meta?: UnitInvoiceFormTasksTableMeta };
		}
	).options?.meta;
}

function taskFieldName(index: number, field: TaskFieldKey): TaskFieldName {
	return `tasks.${index}.${field}`;
}

export function getUnitInvoiceTaskRowId(row: UnitInvoiceTaskRow) {
	return row.fieldId || `unit-invoice-task-${row.index}`;
}

const taskColumn: Column = {
	id: "task",
	header: "Task",
	...sizes.custom(240, 420, 300),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Task",
		className: sizeClass(
			sizes.custom(240, 420, 300),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const taskUid = row.original.taskUid;

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				inputProps={taskUid ? meta?.lockedInputProps : undefined}
				name={taskFieldName(row.original.index, "taskName")}
				placeholder="Task name"
			/>
		);
	},
};

const dueColumn: Column = {
	id: "due",
	header: "Due",
	...sizes.custom(96, 124, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Due",
		className: sizeClass(sizes.custom(96, 124, 104)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const taskUid = row.original.taskUid;

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				inputProps={taskUid ? meta?.lockedInputProps : undefined}
				name={taskFieldName(row.original.index, "amountDue")}
				numericProps={{
					className: taskUid ? "h-8 bg-slate-50 px-2 text-slate-600" : "h-8 px-2",
					prefix: "$",
					placeholder: "$0.00",
					readOnly: !!taskUid,
					type: "tel",
				}}
			/>
		);
	},
};

const paidColumn: Column = {
	id: "paid",
	header: "Paid",
	...sizes.custom(96, 124, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Paid",
		className: sizeClass(sizes.custom(96, 124, 104)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				name={taskFieldName(row.original.index, "amountPaid")}
				numericProps={{
					className: "h-8 px-2",
					prefix: "$",
					placeholder: "$0.00",
					type: "tel",
				}}
			/>
		);
	},
};

const checkColumn: Column = {
	id: "check",
	header: ({ table }) => {
		const meta = getMeta(table);

		return (
			<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
				<span className="truncate">Check</span>
				<Checkbox
					checked={meta?.syncCheckNo ?? false}
					disabled={!meta?.firstCheckNo}
					onCheckedChange={(checked) => meta?.onApplyFirstCheckNoToAll(checked)}
					aria-label="Apply first check number to all invoice tasks"
				/>
			</div>
		);
	},
	...sizes.custom(120, 150, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Check",
		className: sizeClass(sizes.custom(120, 150, 132)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				inputProps={{
					className: "h-8 px-2",
				}}
				name={taskFieldName(row.original.index, "checkNo")}
				placeholder="Check no."
			/>
		);
	},
};

const checkDateColumn: Column = {
	id: "checkDate",
	header: ({ table }) => {
		const meta = getMeta(table);

		return (
			<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
				<span className="truncate">Check Date</span>
				<Checkbox
					checked={meta?.syncCheckDate ?? false}
					disabled={!meta?.firstCheckDate}
					onCheckedChange={(checked) =>
						meta?.onApplyFirstCheckDateToAll(checked)
					}
					aria-label="Apply first check date to all invoice tasks"
				/>
			</div>
		);
	},
	...sizes.custom(136, 170, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Check Date",
		className: sizeClass(sizes.custom(136, 170, 150)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormDate
				className="mx-0 w-full"
				control={meta?.control}
				name={taskFieldName(row.original.index, "checkDate")}
				placeholder="Set date"
				size="sm"
			/>
		);
	},
};

const createdColumn: Column = {
	id: "created",
	header: "Created",
	...sizes.custom(132, 170, 148),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Created",
		className: sizeClass(sizes.custom(132, 170, 148)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormDate
				className="mx-0 w-full"
				control={meta?.control}
				name={taskFieldName(row.original.index, "createdAt")}
				placeholder="Created"
				size="sm"
			/>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 72, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 72, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const taskUid = row.original.taskUid;

		return (
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="size-8"
				disabled={!!taskUid || meta?.deletePending}
				onClick={(event) => {
					event.stopPropagation();
					void meta?.onDeleteTask(row.original.index);
				}}
			>
				<Icons.trash className="size-4" />
			</Button>
		);
	},
};

export const columns: Column[] = [
	taskColumn,
	dueColumn,
	paidColumn,
	checkColumn,
	checkDateColumn,
	createdColumn,
	actionsColumn,
];
