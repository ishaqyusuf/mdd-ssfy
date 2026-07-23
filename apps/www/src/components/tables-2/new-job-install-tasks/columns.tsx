"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { cn } from "@/lib/utils";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { InputGroup } from "@gnd/ui/namespace";
import NumberFlow from "@number-flow/react";
import type { ColumnDef } from "@tanstack/react-table";
import { type Control, Controller } from "react-hook-form";

export type NewJobInstallTaskRow = {
	id: string;
	index: number;
	title: string;
	rate: number;
	maxQty: number;
};

export type NewJobInstallTasksTableMeta = {
	control: Control;
	isAdmin: boolean;
	showTaskQty: boolean;
};

type Column = ColumnDef<NewJobInstallTaskRow>;

function getMeta(table: unknown): NewJobInstallTasksTableMeta | undefined {
	return (
		table as {
			options?: { meta?: NewJobInstallTasksTableMeta };
		}
	).options?.meta;
}

function formatMoney(value: number) {
	if (!Number.isFinite(value)) return "$0.00";

	return `$${value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})}`;
}

function formatCompactMoney(value: number) {
	if (!Number.isFinite(value)) return "$0";

	return `$${value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
	})}`;
}

export function getNewJobInstallTaskRowId(row: NewJobInstallTaskRow) {
	return row.id;
}

const taskColumn: Column = {
	id: "task",
	header: "Item",
	accessorKey: "title",
	...sizes.custom(170, 420, 180),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Item",
		className: sizeClass(
			sizes.custom(170, 420, 180),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate text-xs font-semibold uppercase text-foreground"
					text={row.original.title || "-"}
				/>
				{meta?.showTaskQty ? (
					<Controller
						control={meta.control}
						name={`job.tasks.${row.original.index}.qty`}
						render={({ field: { value } }) => (
							<div className="mt-0.5 truncate text-[11px] text-muted-foreground">
								Max: {row.original.maxQty}.{" "}
								<span className="md:hidden">
									Rate: {formatCompactMoney(row.original.rate)}. Total:{" "}
									{formatCompactMoney(
										(row.original.rate || 0) * (Number(value) || 0),
									)}
								</span>
							</div>
						)}
					/>
				) : null}
			</div>
		);
	},
};

const rateColumn: Column = {
	id: "rate",
	header: "Rate",
	accessorKey: "rate",
	...sizes.custom(84, 124, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Rate",
		className: sizeClass(sizes.custom(84, 124, 96)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-xs font-medium tabular-nums text-muted-foreground">
			{formatMoney(row.original.rate)}
		</span>
	),
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(100, 168, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Qty",
		className: sizeClass(sizes.custom(100, 168, 120), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<Controller
				control={meta?.control}
				name={`job.tasks.${row.original.index}.qty`}
				render={({ field: { onChange, value }, fieldState }) => (
					<div className="w-full min-w-0">
						<InputGroup
							className={cn(
								"h-8 w-full",
								fieldState.error && "border-destructive",
							)}
						>
							<InputGroup.Input
								type="number"
								className="w-full bg-transparent p-0 text-center text-sm font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								value={value || ""}
								min={0}
								max={meta?.isAdmin ? row.original.maxQty : undefined}
								disabled={row.original.maxQty === 0}
								onChange={(event) => {
									onChange(Number(event.target.value));
								}}
								placeholder="0"
							/>
							{meta?.showTaskQty ? (
								<InputGroup.Addon align="inline-end">
									<span className="text-muted-foreground">
										{` / ${row.original.maxQty} `}
									</span>
								</InputGroup.Addon>
							) : null}
						</InputGroup>
						{fieldState.error?.message ? (
							<p className="mt-1 truncate text-center text-xs text-destructive">
								{fieldState.error.message}
							</p>
						) : null}
					</div>
				)}
			/>
		);
	},
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	...sizes.custom(96, 132, 108),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Total",
		className: sizeClass(sizes.custom(96, 132, 108)),
		contentClassName: "text-right",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<Controller
				control={meta?.control}
				name={`job.tasks.${row.original.index}.qty`}
				render={({ field: { value } }) => (
					<span className="block truncate text-xs font-semibold tabular-nums">
						<NumberFlow
							prefix="$"
							value={+((row.original.rate || 0) * +value || 0).toFixed(2)}
						/>
					</span>
				)}
			/>
		);
	},
};

export const columns: Column[] = [
	taskColumn,
	rateColumn,
	qtyColumn,
	totalColumn,
];
