"use client";

import { updateCommunityVersion } from "@/actions/community/update-community-version";
import { useHomeModal } from "@/app-deps/(v1)/(loggedIn)/community/units/home-modal";
import { AuthGuard } from "@/components/auth-guard";
import { usePageTabs } from "@/components/page-tabs/use-page-tabs";
import { _perm } from "@/components/sidebar-links";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useAuth } from "@/hooks/use-auth";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { colorsObject } from "@gnd/utils/colors";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	Edit,
	ExternalLink,
	FileText,
	MoreHorizontal,
	Printer,
	RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useProjectUnitsPrintFlow } from "./print-flow";

export type ProjectUnitRow =
	RouterOutputs["community"]["getProjectUnits"]["data"][number];

type Column = ColumnDef<ProjectUnitRow>;

export function getProjectUnitRowId(unit: ProjectUnitRow) {
	return String(unit.id);
}

function getTemplateHref(unit: ProjectUnitRow) {
	if (!unit.template?.slug) return null;

	const path =
		unit.template.version === "v2" ? "model-template" : "community-template";

	return `/community/${path}/${unit.template.slug.toLowerCase()}`;
}

function getUnitHref(unit: ProjectUnitRow) {
	return unit.slug ? `/community/project-units/${unit.slug}` : null;
}

function getUnitJobsHref(unitId: number) {
	return `/hrm/contractors/jobs?unitId=${unitId}`;
}

function getInstallCostStatusClass(status?: string | null) {
	switch (status) {
		case "ready":
			return "bg-emerald-50 text-emerald-700";
		case "partial":
			return "bg-amber-50 text-amber-700";
		case "not-required":
			return "bg-slate-50 text-slate-600";
		default:
			return "bg-rose-50 text-rose-700";
	}
}

function getTemplateStatusClass(status?: string | null) {
	return status === "ready"
		? "bg-emerald-50 text-emerald-700"
		: "bg-rose-50 text-rose-700";
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

const lotBlockColumn: Column = {
	id: "lotBlock",
	header: "Lot / Block",
	accessorFn: (row) => row.lotBlock,
	...sizes.custom(220, 380, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Lot / Block",
		sortField: "lotBlock",
		className: sizeClass(
			sizes.custom(220, 380, 280),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const unit = row.original;
		const unitHref = getUnitHref(unit);

		const content = (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-semibold"
					text={unit.lotBlock || "No lot/block"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={unit.modelName || "No model"}
				/>
			</div>
		);

		if (!unitHref) return content;

		return (
			<Link
				href={unitHref}
				className="block min-w-0 hover:underline"
				onClick={(event) => event.stopPropagation()}
			>
				{content}
			</Link>
		);
	},
};

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorFn: (row) => row.createdAt,
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		sortField: "date",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => (
		<p className="truncate text-sm font-medium">
			{formatDate(row.original.createdAt)}
		</p>
	),
};

const projectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.project?.title,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Project",
		sortField: "project",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => {
		const unit = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={unit.project?.title || "No project"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={unit.project?.builder?.name || "No builder"}
				/>
			</div>
		);
	},
};

const templateColumn: Column = {
	id: "template",
	header: "Template",
	accessorFn: (row) => row.templateSummary?.configuredCount ?? 0,
	...sizes.custom(180, 300, 220),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "badge" },
		headerLabel: "Template",
		className: sizeClass(sizes.custom(180, 300, 220)),
	},
	cell: ({ row }) => {
		const unit = row.original;
		const href = getTemplateHref(unit);
		const summary = unit.templateSummary;

		const content = (
			<div className="flex min-w-0 items-center gap-2">
				<Badge
					variant={unit.template?.version === "v1" ? "secondary" : "success"}
					className="rounded-full px-1 font-mono text-xs font-semibold"
				>
					{unit.template?.version || "n/a"}
				</Badge>
				<div
					className={cn(
						"inline-flex min-w-0 items-center rounded-md px-2 py-1",
						getTemplateStatusClass(summary?.status),
					)}
				>
					<span className="truncate text-xs font-semibold">
						{summary?.configuredCount || 0} configs
					</span>
				</div>
			</div>
		);

		if (!href) return content;

		return (
			<Link
				href={href}
				className="inline-flex min-w-0 hover:opacity-90"
				onClick={(event) => event.stopPropagation()}
			>
				{content}
			</Link>
		);
	},
};

const installCostColumn: Column = {
	id: "installCost",
	header: "Install Cost",
	accessorFn: (row) => row.installCostSummary?.totalEstimate ?? 0,
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "button", width: "w-28" },
		headerLabel: "Install Cost",
		className: sizeClass(sizes.custom(150, 260, 180)),
	},
	cell: ({ row }) => {
		const unit = row.original;
		const summary = unit.installCostSummary;
		const { setParams } = useCommunityInstallCostParams();

		return (
			<button
				type="button"
				disabled={!unit.template?.id}
				onClick={(event) => {
					event.stopPropagation();
					if (!unit.template?.id) return;
					setParams({
						editCommunityModelInstallCostId: unit.template.id,
						mode: "v2",
						view: "template-list",
					});
				}}
				className={cn(
					"inline-flex max-w-full flex-col rounded-md px-2 py-1 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
					getInstallCostStatusClass(summary?.status),
				)}
			>
				<span className="truncate text-sm font-semibold">
					{summary?.totalEstimate
						? `$${summary.totalEstimate.toFixed(0)}`
						: summary?.status === "not-required"
							? "N/A"
							: "$0"}
				</span>
				<span className="truncate text-xs">
					{summary?.totalTasks
						? `${summary.configuredTasks}/${summary.totalTasks} tasks`
						: "No tasks"}
				</span>
			</button>
		);
	},
};

const productionColumn: Column = {
	id: "production",
	header: "Production",
	accessorFn: (row) => row.production?.status,
	...sizes.custom(140, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Production",
		className: sizeClass(sizes.custom(140, 240, 170)),
	},
	cell: ({ row }) => {
		const production = row.original.production;

		return (
			<div className="w-full max-w-[150px]">
				<Progress>
					<Progress.Status>{production?.status || "Idle"}</Progress.Status>
				</Progress>
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{production?.date || "No date"}
				</p>
			</div>
		);
	},
};

const installationColumn: Column = {
	id: "installation",
	header: "Installation",
	accessorFn: (row) => row.jobCount,
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "badge" },
		headerLabel: "Installation",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => {
		const unit = row.original;

		return (
			<Link
				href={getUnitJobsHref(unit.id)}
				aria-label={`Open jobs filtered to unit ${unit.lotBlock || unit.id}`}
				className="inline-flex"
				onClick={(event) => event.stopPropagation()}
			>
				<Badge
					variant="secondary"
					style={{
						backgroundColor:
							Number(unit.jobCount || 0) > 0
								? colorsObject.limeGreen
								: colorsObject.dimGray,
					}}
					className="h-5 whitespace-nowrap px-1 text-xs text-slate-100"
				>
					{unit.jobCount || 0} submitted
				</Badge>
			</Link>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(112, 150, 124),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-10" },
		className: sizeClass(
			sizes.custom(112, 150, 124),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

export const columns: Column[] = [
	selectColumn,
	lotBlockColumn,
	dateColumn,
	projectColumn,
	templateColumn,
	installCostColumn,
	productionColumn,
	installationColumn,
	actionsColumn,
];

export const projectTabColumns: Column[] = [
	selectColumn,
	lotBlockColumn,
	dateColumn,
	templateColumn,
	installCostColumn,
	productionColumn,
	installationColumn,
	actionsColumn,
];

const restrictedProjectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.project?.title,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Project",
		sortField: "project",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.project?.title || "-"}
		/>
	),
};

const builderColumn: Column = {
	id: "builder",
	header: "Builder",
	accessorFn: (row) => row.project?.builder?.name,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Builder",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.project?.builder?.name || "-"}
		/>
	),
};

const modelColumn: Column = {
	id: "model",
	header: "Model",
	accessorFn: (row) => row.modelName,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Model",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => {
		const href = getTemplateHref(row.original);
		const label = row.original.modelName || "-";

		if (!href) {
			return <TextWithTooltip className="max-w-full truncate" text={label} />;
		}

		return (
			<Link
				href={href}
				className="block max-w-full truncate font-medium hover:underline"
				onClick={(event) => event.stopPropagation()}
			>
				{label}
			</Link>
		);
	},
};

const lotColumn: Column = {
	id: "lot",
	header: "Lot",
	accessorFn: (row) => row.lot,
	...sizes.custom(100, 180, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Lot",
		className: sizeClass(sizes.custom(100, 180, 120)),
	},
	cell: ({ row }) => (
		<p className="truncate font-medium">{row.original.lot || "-"}</p>
	),
};

const blockColumn: Column = {
	id: "block",
	header: "Block",
	accessorFn: (row) => row.block,
	...sizes.custom(100, 180, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Block",
		className: sizeClass(sizes.custom(100, 180, 120)),
	},
	cell: ({ row }) => (
		<p className="truncate font-medium">{row.original.block || "-"}</p>
	),
};

export const communityUnitColumns: Column[] = [
	restrictedProjectColumn,
	builderColumn,
	modelColumn,
	lotColumn,
	blockColumn,
];

function Actions({ item }: { item: ProjectUnitRow }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const pageTabs = usePageTabs();
	const router = useRouter();
	const auth = useAuth();
	const unitModal = useHomeModal();
	const isCommunityUnit = isCommunityUnitRestrictedAccess(auth.can);
	const { startPrint } = useProjectUnitsPrintFlow();
	const [isPending, startTransition] = useTransition();
	const unitHref = getUnitHref(item);
	const templateHref = getTemplateHref(item);
	const printableUnit =
		typeof item.id === "number"
			? {
					id: item.id,
					slug: item.slug,
					lotBlock: item.lotBlock,
					modelName: item.modelName,
				}
			: null;

	const deleteMutation = useMutation(
		trpc.community.deleteUnits.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.community.getProjectUnits.infiniteQueryKey(),
				});
				await pageTabs.invalidate("units");
			},
		}),
	);

	const preview = (version: "v1" | "v2") => {
		if (typeof item.id !== "number") return;

		openLink(
			"p/model-template",
			{
				preview: true,
				homeIds: String(item.id),
				version,
				templateSlug: item.template?.slug,
			},
			true,
		);
	};

	const updateVersion = (version: "v1" | "v2") => {
		if (!item.template?.id) {
			toast({
				title: "Template missing",
				description: "This unit does not have a template to update.",
				variant: "destructive",
			});
			return;
		}

		startTransition(async () => {
			await updateCommunityVersion(item.template.id, version);
			toast({
				title: "Updated",
				variant: "success",
			});
			await queryClient.invalidateQueries({
				queryKey: trpc.community.getProjectUnits.infiniteQueryKey(),
			});
			await pageTabs.invalidate("units");
		});
	};

	return (
		<div className="relative z-10 flex items-center justify-end gap-2">
			{isCommunityUnit ? null : (
				<AuthGuard rules={[_perm.is("editProject")]}>
					<ConfirmBtn
						onClick={async () => {
							if (typeof item.id !== "number") return;

							await deleteMutation.mutateAsync({
								unitIds: [item.id],
							});
						}}
						trash
						variant="outline"
						className="size-8 px-0"
						size="sm"
					/>
				</AuthGuard>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="size-8">
						<MoreHorizontal className="size-4" />
						<span className="sr-only">Open unit actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem
						disabled={!unitHref}
						onClick={() => {
							if (unitHref) router.push(unitHref);
						}}
					>
						<ExternalLink className="mr-2 size-4" />
						Open unit
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={!templateHref}
						onClick={() => {
							if (templateHref) router.push(templateHref);
						}}
					>
						<FileText className="mr-2 size-4" />
						Open template
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={isPending}>
							<RefreshCcw className="mr-2 size-4" />
							Update version
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem onClick={() => updateVersion("v1")}>
								v1
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => updateVersion("v2")}>
								v2
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<FileText className="mr-2 size-4" />
							Preview
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem onClick={() => preview("v1")}>
								v1
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => preview("v2")}>
								v2
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem
						disabled={!printableUnit}
						onClick={() => {
							if (printableUnit) {
								startPrint([printableUnit]);
							}
						}}
					>
						<Printer className="mr-2 size-4" />
						Print
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => unitModal.open(item)}>
						<Edit className="mr-2 size-4" />
						Edit
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
