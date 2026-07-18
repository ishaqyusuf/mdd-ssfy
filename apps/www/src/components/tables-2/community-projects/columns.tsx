"use client";

import {
	updateProjectArchivedAction,
	updateProjectSupervisorAction,
} from "@/actions/community/project-actions";
import { deleteProjectAction } from "@/app-deps/(v1)/(loggedIn)/community/projects/actions/delete-project-action";
import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { updateProjectMeta } from "@/app-deps/(v1)/_actions/community/projects";
import { useModal } from "@/components/common/modal/provider";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { IProject, IProjectMeta } from "@/types/community";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CommunityProjectRow =
	RouterOutputs["community"]["getCommunityProjects"]["data"][number];

type Column = ColumnDef<CommunityProjectRow>;

const moneyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function getCommunityProjectRowId(project: CommunityProjectRow) {
	return String(project.id);
}

function statusClasses(archived?: boolean | null) {
	return archived
		? "border-amber-200 bg-amber-50 text-amber-700"
		: "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getProductionMeta(item: CommunityProjectRow) {
	const total = item.homeTasks?.length || 0;
	const completed =
		item.homeTasks?.filter((task) => task.producedAt).length || 0;
	const started =
		item.homeTasks?.filter((task) => !task.producedAt && task.prodStartedAt)
			.length || 0;
	const queued =
		item.homeTasks?.filter(
			(task) =>
				!task.producedAt &&
				!task.prodStartedAt &&
				task.sentToProductionAt,
		).length || 0;

	let label = "Idle";
	if (!total) label = "No tasks";
	else if (completed === total) label = "Completed";
	else if (started > 0 || completed > 0) label = "Started";
	else if (queued > 0) label = "Queued";

	return {
		total,
		completed,
		label,
	};
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
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

const projectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.title,
	...sizes.custom(240, 460, 320),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Project",
		className: sizeClass(
			sizes.custom(240, 460, 320),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const project = row.original;

		return (
			<Link
				href={`/community/projects/${project.slug}`}
				className="flex min-w-0 flex-col gap-1"
				onClick={(event) => event.stopPropagation()}
			>
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={project.title || "Untitled project"}
				/>
				<span className="truncate text-xs text-muted-foreground">
					{project.builder?.name || "No builder"}
				</span>
			</Link>
		);
	},
};

const refDateColumn: Column = {
	id: "refDate",
	header: "Ref / Date",
	accessorFn: (row) => row.refNo,
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Ref / Date",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate font-mono font-medium">
				{row.original.refNo || "No ref"}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				{formatDate(row.original.createdAt)}
			</p>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => row.archived,
	...sizes.custom(110, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(110, 180, 130)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className={statusClasses(row.original.archived)}>
			{row.original.archived ? "Archived" : "Active"}
		</Badge>
	),
};

const supervisorColumn: Column = {
	id: "supervisor",
	header: "Supervisor",
	accessorFn: (row) => row.meta?.supervisor?.name,
	...sizes.custom(220, 360, 260),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-36" },
		headerLabel: "Supervisor",
		className: sizeClass(sizes.custom(220, 360, 260)),
	},
	cell: ({ row }) => <SupervisorCell item={row.original} />,
};

const unitsColumn: Column = {
	id: "units",
	header: "Units",
	accessorFn: (row) => row._count.homes,
	...sizes.custom(100, 160, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-10" },
		headerLabel: "Units",
		className: sizeClass(sizes.custom(100, 160, 120), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<Link
			href={`/community/project-units?projectSlug=${row.original.slug}`}
			className="font-mono font-semibold hover:underline"
			onClick={(event) => event.stopPropagation()}
		>
			{row.original._count.homes}
		</Link>
	),
};

const productionColumn: Column = {
	id: "production",
	header: "Production",
	accessorFn: (row) => row._count.homeTasks,
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Production",
		className: sizeClass(sizes.custom(150, 240, 170)),
	},
	cell: ({ row }) => {
		const production = getProductionMeta(row.original);

		return (
			<div className="min-w-0 space-y-1">
				<p className="truncate font-medium">{production.label}</p>
				<p className="truncate text-xs text-muted-foreground">
					{production.completed}/{production.total} completed
				</p>
			</div>
		);
	},
};

const financeColumn: Column = {
	id: "finance",
	header: "Jobs / Invoices",
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Jobs / Invoices",
		className: sizeClass(sizes.custom(150, 240, 170)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate font-medium">{row.original._count.jobs} jobs</p>
			<p className="truncate text-xs text-muted-foreground">
				{row.original._count.invoices} invoices
			</p>
		</div>
	),
};

const addonColumn: Column = {
	id: "addon",
	header: "Addon",
	accessorFn: (row) => row.meta?.addon,
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-24" },
		headerLabel: "Addon",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => <AddonCell project={row.original} />,
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.xs,
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-10" },
		className: sizeClass(
			sizes.xs,
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

export const columns: Column[] = [
	selectColumn,
	projectColumn,
	refDateColumn,
	statusColumn,
	supervisorColumn,
	unitsColumn,
	productionColumn,
	financeColumn,
	addonColumn,
	actionsColumn,
];

function SupervisorCell({ item }: { item: CommunityProjectRow }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [supervisor, setSupervisor] = useState({
		name: item.meta?.supervisor?.name || "",
		email: item.meta?.supervisor?.email || "",
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 max-w-full justify-start px-3"
					onClick={(event) => event.stopPropagation()}
				>
					{item.meta?.supervisor?.name ? (
						<span className="truncate text-left">
							{item.meta.supervisor.name}
							{item.meta.supervisor.email
								? ` - ${item.meta.supervisor.email}`
								: ""}
						</span>
					) : (
						<>
							<Icons.UserPlus className="mr-2 size-4" />
							Add supervisor
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-72 space-y-3 p-4"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="space-y-1">
					<h4 className="text-sm font-semibold text-slate-900">
						Update supervisor
					</h4>
					<p className="text-xs text-slate-500">
						Save a direct owner for this project so operations can route
						follow-ups quickly.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`supervisor-name-${item.id}`}>Name</Label>
					<Input
						id={`supervisor-name-${item.id}`}
						value={supervisor.name}
						onChange={(event) =>
							setSupervisor((prev) => ({
								...prev,
								name: event.target.value,
							}))
						}
						placeholder="Supervisor name"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`supervisor-email-${item.id}`}>Email</Label>
					<Input
						id={`supervisor-email-${item.id}`}
						value={supervisor.email}
						onChange={(event) =>
							setSupervisor((prev) => ({
								...prev,
								email: event.target.value,
							}))
						}
						placeholder="Supervisor email"
					/>
				</div>
				<div className="flex justify-between gap-2">
					<Button
						variant="ghost"
						size="sm"
						disabled={isPending}
						onClick={() => {
							startTransition(async () => {
								await updateProjectSupervisorAction({
									projectId: item.id,
									supervisor: {},
								});
								router.refresh();
								setOpen(false);
							});
						}}
					>
						Clear
					</Button>
					<Button
						size="sm"
						disabled={isPending}
						onClick={() => {
							startTransition(async () => {
								await updateProjectSupervisorAction({
									projectId: item.id,
									supervisor,
								});
								router.refresh();
								setOpen(false);
							});
						}}
					>
						Save
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function AddonCell({ project }: { project: CommunityProjectRow }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const projectMeta = (project.meta ?? {}) as IProjectMeta;
	const [addon, setAddon] = useState({
		current: Number(projectMeta.addon || 0),
		input: String(projectMeta.addon || ""),
	});

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="secondary"
					className="h-8 max-w-full justify-start px-3"
					onClick={(event) => event.stopPropagation()}
				>
					<span className="truncate">
						{addon.current > 0
							? moneyFormatter.format(addon.current)
							: "Add Addon"}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="grid w-[185px] gap-2 p-4"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="grid gap-2">
					<Label htmlFor={`project-addon-${project.id}`}>Addon</Label>
					<Input
						id={`project-addon-${project.id}`}
						className="h-8"
						value={addon.input}
						onChange={(event) =>
							setAddon((prev) => ({
								...prev,
								input: event.target.value,
							}))
						}
						type="number"
					/>
				</div>
				<div className="flex justify-end">
					<Button
						size="sm"
						disabled={isPending}
						onClick={() => {
							startTransition(async () => {
								const nextAddon = Number(addon.input || 0);
								await updateProjectMeta(project.id, {
									...projectMeta,
									addon: nextAddon,
								});
								setAddon((prev) => ({
									...prev,
									current: nextAddon,
								}));
								router.refresh();
								setOpen(false);
							});
						}}
					>
						Save
					</Button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Actions({ item }: { item: CommunityProjectRow }) {
	const router = useRouter();
	const modal = useModal();
	const [isPending, startTransition] = useTransition();

	return (
		<div className="relative z-10 flex justify-end">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={(event) => event.stopPropagation()}
					>
						<Icons.MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onClick={(event) => event.stopPropagation()}
				>
					<DropdownMenuItem asChild>
						<Link href={`/community/projects/${item.slug}`}>
							<Icons.Building2 className="mr-2 size-4" />
							Open overview
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={`/community/project-units?projectSlug=${item.slug}`}>
							<Icons.Building2 className="mr-2 size-4" />
							Open units
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() =>
							modal.openModal(
								<ProjectModal data={item as unknown as IProject} />,
							)
						}
					>
						<Icons.Pencil className="mr-2 size-4" />
						Edit project
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={isPending}
						onClick={() => {
							startTransition(async () => {
								await updateProjectArchivedAction({
									projectIds: [item.id],
									archived: !item.archived,
								});
								router.refresh();
							});
						}}
					>
						<Icons.FolderArchive className="mr-2 size-4" />
						{item.archived ? "Mark active" : "Archive project"}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						disabled={isPending}
						onClick={() => {
							startTransition(async () => {
								await deleteProjectAction(item.id);
								router.refresh();
							});
						}}
					>
						<Icons.Trash2 className="mr-2 size-4" />
						Delete project
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
