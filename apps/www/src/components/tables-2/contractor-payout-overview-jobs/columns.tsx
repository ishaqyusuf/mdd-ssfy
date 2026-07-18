"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type ContractorPayoutOverviewJobRow =
	RouterOutputs["jobs"]["contractorPayoutOverview"]["jobs"][number];

type Column = ColumnDef<ContractorPayoutOverviewJobRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not set";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function normalizeInlineText(value?: string | null) {
	return String(value || "")
		.replace(/\s+/g, " ")
		.trim();
}

function isGenericCustomJob(job: ContractorPayoutOverviewJobRow) {
	const title = normalizeInlineText(job.title).toLowerCase();
	const subtitle = normalizeInlineText(job.subtitle).toLowerCase();

	return (
		job.isCustom === true || title === "custom job" || subtitle === "custom"
	);
}

function splitDescription(value?: string | null) {
	const description = normalizeInlineText(value);
	if (!description) {
		return {
			lead: null,
			detail: null,
		};
	}

	const parts = description
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length > 1) {
		return {
			lead: parts[0],
			detail: parts.slice(1).join("; "),
		};
	}

	return {
		lead: description,
		detail: null,
	};
}

function getPayoutJobDisplay(job: ContractorPayoutOverviewJobRow) {
	const genericCustomJob = isGenericCustomJob(job);
	const description = splitDescription(job.description);
	const subtitle = normalizeInlineText(job.subtitle);
	const title = normalizeInlineText(job.title) || "Untitled job";
	const label =
		genericCustomJob && description.lead
			? description.lead
			: subtitle && !genericCustomJob
				? `${title} - ${subtitle}`
				: title;
	const detail =
		genericCustomJob && description.lead
			? description.detail
			: normalizeInlineText(job.description) || null;
	const unit = [job.lotBlock, job.modelName]
		.map((item) => normalizeInlineText(item))
		.filter(Boolean)
		.join(" • ");

	return {
		label,
		detail,
		location:
			[normalizeInlineText(job.projectTitle), unit]
				.filter(Boolean)
				.join(" • ") ||
			(genericCustomJob
				? "Custom job • Details in description"
				: "No location details"),
	};
}

export function getContractorPayoutOverviewJobRowId(
	row: ContractorPayoutOverviewJobRow,
) {
	return String(row.id);
}

const jobColumn: Column = {
	id: "job",
	header: "Job",
	accessorKey: "id",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Job",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const display = getPayoutJobDisplay(row.original);

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={`#${row.original.id} ${display.label}`}
				/>
				{display.detail ? (
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={display.detail}
					/>
				) : null}
			</div>
		);
	},
};

const locationColumn: Column = {
	id: "location",
	header: "Location",
	accessorFn: (row) => getPayoutJobDisplay(row).location,
	...sizes.custom(190, 360, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Location",
		className: sizeClass(sizes.custom(190, 360, 240)),
	},
	cell: ({ row }) => {
		const display = getPayoutJobDisplay(row.original);

		return (
			<TextWithTooltip
				className="max-w-full truncate text-muted-foreground"
				text={display.location}
			/>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(110, 160, 122),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(110, 160, 122)),
	},
	cell: ({ row }) => (
		<Badge
			variant="secondary"
			className="h-5 max-w-full rounded-full text-[10px]"
		>
			<span className="truncate">{row.original.status || "Unknown"}</span>
		</Badge>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-semibold">
			{formatCurrency(row.original.amount)}
		</span>
	),
};

const createdColumn: Column = {
	id: "created",
	header: "Created",
	accessorKey: "createdAt",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Created",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => (
		<span className="truncate text-sm text-muted-foreground">
			{formatDate(row.original.createdAt)}
		</span>
	),
};

export const columns: Column[] = [
	jobColumn,
	locationColumn,
	statusColumn,
	amountColumn,
	createdColumn,
];
