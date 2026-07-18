"use client";

import {
	BUG_REPORT_STATUS_BADGE_CLASS,
	BUG_REPORT_STATUS_LABELS,
	type BugReportStatus,
	formatBugReportDuration,
} from "@/components/bug-reports/status";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type BugReportRow = RouterOutputs["bugReports"]["mine"][number];

export type BugReportsTableMeta = {
	selectedId?: string | null;
	onSelectReport: (row: BugReportRow) => void | Promise<void>;
};

type Column = ColumnDef<BugReportRow>;

function getMeta(table: unknown): BugReportsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: BugReportsTableMeta };
		}
	).options?.meta;
}

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function StatusBadge({ status }: { status: BugReportStatus }) {
	return (
		<Badge
			variant="outline"
			className={cn("rounded-full", BUG_REPORT_STATUS_BADGE_CLASS[status])}
		>
			{BUG_REPORT_STATUS_LABELS[status]}
		</Badge>
	);
}

export function getBugReportRowId(row: BugReportRow) {
	return row.id;
}

const reportColumn: Column = {
	id: "report",
	header: "Report",
	accessorFn: (row) => row.description || "Bug report",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-52" },
		headerLabel: "Report",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.description || "Bug report"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.createdBy?.name || "You"}
			/>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(118, 170, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(118, 170, 136)),
	},
	cell: ({ row }) => (
		<StatusBadge status={row.original.status as BugReportStatus} />
	),
};

const captureColumn: Column = {
	id: "capture",
	header: "Capture",
	accessorKey: "captureType",
	...sizes.custom(110, 170, 126),
	enableResizing: true,
	meta: {
		skeleton: { type: "icon-text", width: "w-24" },
		headerLabel: "Capture",
		className: sizeClass(sizes.custom(110, 170, 126)),
	},
	cell: ({ row }) => {
		const isScreenshot = row.original.captureType === "SCREENSHOT";

		return (
			<div className="flex min-w-0 items-center gap-2">
				<Icons.Camera className="size-3.5 shrink-0 text-muted-foreground" />
				<TextWithTooltip
					className="max-w-full truncate text-sm"
					text={
						isScreenshot
							? "Screenshot"
							: formatBugReportDuration(row.original.durationMs)
					}
				/>
			</div>
		);
	},
};

const followUpsColumn: Column = {
	id: "followUps",
	header: "Replies",
	accessorKey: "followUpCount",
	...sizes.custom(86, 126, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Replies",
		className: sizeClass(sizes.custom(86, 126, 96)),
	},
	cell: ({ row }) => (
		<div className="flex items-center gap-1.5 text-sm">
			<Icons.MessageSquare className="size-3.5 text-muted-foreground" />
			<span>{row.original.followUpCount || 0}</span>
		</div>
	),
};

const createdAtColumn: Column = {
	id: "createdAt",
	header: "Submitted",
	accessorKey: "createdAt",
	...sizes.custom(126, 190, 146),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Submitted",
		className: sizeClass(sizes.custom(126, 190, 146)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={formatDate(row.original.createdAt)}
		/>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 80, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 80, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedId === row.original.id;

		return (
			<Button
				type="button"
				size="icon-sm"
				variant={selected ? "default" : "ghost"}
				aria-label="Open bug report"
				onClick={() => {
					void meta?.onSelectReport(row.original);
				}}
			>
				<Icons.Eye className="size-4" />
			</Button>
		);
	},
};

export const columns: Column[] = [
	reportColumn,
	statusColumn,
	captureColumn,
	followUpsColumn,
	createdAtColumn,
	actionsColumn,
];
