"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type TaskRunDiagnosticsRow =
	RouterOutputs["taskRunDiagnostics"]["list"]["list"][number];

export type TaskRunDiagnosticsTableMeta = {
	reviewingDiagnosticId?: string | null;
	onMarkReviewed: (diagnostic: TaskRunDiagnosticsRow) => void;
};

type Column = ColumnDef<TaskRunDiagnosticsRow>;

function getMeta(table: unknown): TaskRunDiagnosticsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: TaskRunDiagnosticsTableMeta };
		}
	).options?.meta;
}

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "Not set";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "";

	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function taskDiagnosticStatusLabel(
	status: TaskRunDiagnosticsRow["status"],
) {
	switch (status) {
		case "RUNNING":
			return "Running";
		case "SUCCEEDED":
			return "Succeeded";
		case "FAILED":
			return "Failed";
		case "CANCELED":
			return "Canceled";
		case "STALE":
			return "Stale";
		case "START_FAILED":
			return "Start failed";
		default:
			return status;
	}
}

function statusClassName(status: TaskRunDiagnosticsRow["status"]) {
	switch (status) {
		case "FAILED":
		case "START_FAILED":
		case "STALE":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "SUCCEEDED":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "RUNNING":
			return "border-sky-200 bg-sky-50 text-sky-700";
		case "CANCELED":
			return "border-muted bg-muted/40 text-muted-foreground";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

function formatOutputSummary(value: unknown) {
	if (!value || typeof value !== "object") return null;
	const summary = value as Record<string, unknown>;
	const emails = summary.emails as Record<string, unknown> | undefined;

	if (emails && typeof emails === "object") {
		return `Emails sent: ${Number(emails.sent || 0)}, failed: ${Number(
			emails.failed || 0,
		)}, skipped: ${Number(emails.skipped || 0)}`;
	}

	if (summary.present) return "Output captured.";

	return null;
}

function diagnosticMessage(diagnostic: TaskRunDiagnosticsRow) {
	return (
		diagnostic.internalError ||
		formatOutputSummary(diagnostic.outputSummary) ||
		diagnostic.userMessage ||
		"No error captured"
	);
}

export function getTaskRunDiagnosticsRowId(row: TaskRunDiagnosticsRow) {
	return row.id;
}

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(128, 196, 148),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(
			sizes.custom(128, 196, 148),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const diagnostic = row.original;

		return (
			<div className="flex min-w-0 items-center gap-2">
				<Badge
					variant="outline"
					className={`${statusClassName(diagnostic.status)} shrink-0`}
				>
					{taskDiagnosticStatusLabel(diagnostic.status)}
				</Badge>
				<TextWithTooltip
					className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
					text={diagnostic.source || diagnostic.environment || "Task run"}
				/>
			</div>
		);
	},
};

const taskColumn: Column = {
	id: "task",
	header: "Task",
	accessorFn: (row) => row.title || row.taskName,
	...sizes.custom(190, 360, 230),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Task",
		className: sizeClass(sizes.custom(190, 360, 230)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.title || row.original.taskName}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.runId || row.original.taskName}
			/>
		</div>
	),
};

const entityColumn: Column = {
	id: "entity",
	header: "Entity",
	accessorFn: (row) => row.entityLabel || row.entityType || row.entityId || "",
	...sizes.custom(150, 280, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Entity",
		className: sizeClass(sizes.custom(150, 280, 180)),
	},
	cell: ({ row }) => {
		const reference =
			[row.original.entityType, row.original.entityId]
				.filter(Boolean)
				.join(" / ") || "No reference";

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={row.original.entityLabel || "No entity"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={reference}
				/>
			</div>
		);
	},
};

const actorColumn: Column = {
	id: "actor",
	header: "User",
	accessorFn: (row) => row.actorName || row.actorEmail || "",
	...sizes.custom(160, 300, 200),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "User",
		className: sizeClass(sizes.custom(160, 300, 200)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.actorName || "Unknown user"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.actorEmail || "No email"}
			/>
		</div>
	),
};

const startedColumn: Column = {
	id: "startedAt",
	header: "Started",
	accessorFn: (row) => row.startedAt || row.createdAt,
	...sizes.custom(118, 180, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Started",
		className: sizeClass(sizes.custom(118, 180, 136)),
	},
	cell: ({ row }) => {
		const date = row.original.startedAt || row.original.createdAt;

		return (
			<div className="min-w-0 space-y-0.5">
				<p className="truncate text-sm">{formatDate(date)}</p>
				<p className="truncate text-xs text-muted-foreground">
					{formatTime(date)}
				</p>
			</div>
		);
	},
};

const messageColumn: Column = {
	id: "message",
	header: "Error",
	accessorFn: diagnosticMessage,
	...sizes.custom(220, 460, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-60" },
		headerLabel: "Error",
		className: sizeClass(sizes.custom(220, 460, 280)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={diagnosticMessage(row.original)}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.errorName || row.original.description || "Details"}
			/>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(108, 140, 120),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(108, 140, 120),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const diagnostic = row.original;
		const isReviewing = meta?.reviewingDiagnosticId === diagnostic.id;

		if (diagnostic.reviewedAt) {
			return (
				<span className="text-xs text-muted-foreground" aria-label="Reviewed">
					Reviewed
				</span>
			);
		}

		return (
			<Button
				type="button"
				size="sm"
				disabled={isReviewing}
				onClick={(event) => {
					event.stopPropagation();
					meta?.onMarkReviewed(diagnostic);
				}}
			>
				{isReviewing ? (
					<Icons.Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<Icons.Check className="mr-2 size-4" />
				)}
				Review
			</Button>
		);
	},
};

export const columns: Column[] = [
	statusColumn,
	taskColumn,
	entityColumn,
	actorColumn,
	startedColumn,
	messageColumn,
	actionsColumn,
];
