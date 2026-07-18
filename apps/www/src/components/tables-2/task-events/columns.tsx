"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type TaskEventRow =
	RouterOutputs["taskEvents"]["list"]["events"][number];

type TaskEventLatestMeta = {
	triggerType?: string;
	statusUsed?: string;
	found?: number;
	sent?: number;
	failed?: number;
	skipped?: number;
};

type Column = ColumnDef<TaskEventRow>;

function parseHistoryMeta(value: unknown): TaskEventLatestMeta | null {
	if (!value || typeof value !== "object") return null;
	return value as TaskEventLatestMeta;
}

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(value?: Date | string | null) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

function statusClassName(status: TaskEventRow["config"]["status"]) {
	return status === "active"
		? "border-emerald-200 bg-emerald-50 text-emerald-700"
		: "border-muted bg-muted/40 text-muted-foreground";
}

export function getTaskEventRowId(row: TaskEventRow) {
	return row.eventName;
}

const eventColumn: Column = {
	id: "event",
	header: "Event",
	accessorKey: "title",
	...sizes.custom(260, 520, 340),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Event",
		className: sizeClass(
			sizes.custom(260, 520, 340),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.title}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.description || row.original.eventName}
			/>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => row.config.status,
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={statusClassName(row.original.config.status)}
		>
			{row.original.config.status}
		</Badge>
	),
};

const lastRunColumn: Column = {
	id: "lastRun",
	header: "Last Run",
	accessorFn: (row) => row.latestHistory?.createdAt ?? null,
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Last Run",
		className: sizeClass(sizes.custom(150, 240, 170)),
	},
	cell: ({ row }) => {
		const value = row.original.latestHistory?.createdAt;

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={formatDate(value)}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={formatTime(value) || "No run yet"}
				/>
			</div>
		);
	},
};

const recordsColumn: Column = {
	id: "records",
	header: "Records",
	accessorFn: (row) => row.latestHistory?.value ?? 0,
	...sizes.custom(108, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Records",
		className: sizeClass(sizes.custom(108, 150, 124), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{row.original.latestHistory?.value ?? 0}
		</span>
	),
};

const latestResultColumn: Column = {
	id: "latestResult",
	header: "Latest Result",
	accessorFn: (row) => row.latestHistory?.meta ?? null,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Latest Result",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => {
		const meta = parseHistoryMeta(row.original.latestHistory?.meta);

		if (!meta) {
			return <span className="text-sm text-muted-foreground">No result</span>;
		}

		const result = [
			`Found: ${meta.found ?? 0}`,
			`Sent: ${meta.sent ?? 0}`,
			`Failed: ${meta.failed ?? 0}`,
			`Skipped: ${meta.skipped ?? 0}`,
		].join(" | ");

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={`Trigger: ${meta.triggerType || "-"}`}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={`${meta.statusUsed || "-"} | ${result}`}
				/>
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(96, 128, 108),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(96, 128, 108),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => (
		<div className="relative z-10 flex items-center justify-end">
			<Button
				type="button"
				variant="outline"
				size="sm"
				asChild
				onClick={(event) => event.stopPropagation()}
			>
				<Link href={`/task-events/${row.original.eventName}`}>Open</Link>
			</Button>
		</div>
	),
};

export const columns: Column[] = [
	eventColumn,
	statusColumn,
	lastRunColumn,
	recordsColumn,
	latestResultColumn,
	actionsColumn,
];
