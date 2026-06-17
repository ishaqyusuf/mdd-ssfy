"use client";

import { useBuilderParams } from "@/hooks/use-builder-params";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type CommunityBuilderRow =
	RouterOutputs["community"]["getBuilders"]["data"][number];

type Column = ColumnDef<CommunityBuilderRow>;

export function getCommunityBuilderRowId(builder: CommunityBuilderRow) {
	return String(builder.id);
}

function getInitials(value?: string | null) {
	if (!value) return "BU";

	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}

const builderColumn: Column = {
	id: "builder",
	header: "Builder",
	accessorFn: (row) => row.name,
	size: 340,
	minSize: 240,
	maxSize: 480,
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Builder",
		sortField: "name",
		className:
			"w-[340px] min-w-[240px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => {
		const builder = row.original;
		const name = builder.name || "Unnamed builder";

		return (
			<div className="flex min-w-0 items-center gap-3 overflow-hidden">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
					{getInitials(name)}
				</div>
				<div className="min-w-0 space-y-1">
					<TextWithTooltip
						className="max-w-full truncate font-medium uppercase"
						text={name}
					/>
					<div className="font-mono text-xs text-muted-foreground">
						#{builder.id}
					</div>
				</div>
			</div>
		);
	},
};

const projectsColumn: Column = {
	id: "projects",
	header: "Projects",
	accessorFn: (row) => row._count?.projects ?? 0,
	size: 140,
	minSize: 110,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Projects",
		className: "w-[140px] min-w-[110px]",
	},
	cell: ({ row }) => (
		<span className="font-mono text-sm">
			{row.original._count?.projects ?? 0}
		</span>
	),
};

const tasksColumn: Column = {
	id: "tasks",
	header: "Tasks",
	accessorFn: (row) => row._count?.tasks ?? 0,
	size: 140,
	minSize: 110,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Tasks",
		className: "w-[140px] min-w-[110px]",
	},
	cell: ({ row }) => (
		<span className="font-mono text-sm">{row.original._count?.tasks ?? 0}</span>
	),
};

const homesColumn: Column = {
	id: "homes",
	header: "Homes",
	accessorFn: (row) => row._count?.homes ?? 0,
	size: 140,
	minSize: 110,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Homes",
		className: "w-[140px] min-w-[110px]",
	},
	cell: ({ row }) => (
		<span className="font-mono text-sm">{row.original._count?.homes ?? 0}</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	size: 84,
	minSize: 72,
	maxSize: 100,
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-10" },
		className: "w-[84px] min-w-[72px]",
	},
	cell: ({ row }) => <Actions builder={row.original} />,
};

function Actions({ builder }: { builder: CommunityBuilderRow }) {
	const { setParams } = useBuilderParams();

	return (
		<div className="flex justify-end">
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className={cn("size-8")}
				onClick={(event) => {
					event.stopPropagation();
					setParams({
						openBuilderId: builder.id,
					});
				}}
			>
				<Icons.Edit className="size-4" />
			</Button>
		</div>
	);
}

export const columns: Column[] = [
	builderColumn,
	projectsColumn,
	tasksColumn,
	homesColumn,
	actionsColumn,
];
