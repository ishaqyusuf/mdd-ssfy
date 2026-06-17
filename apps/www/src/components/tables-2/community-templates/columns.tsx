"use client";

import { Menu } from "@gnd/ui/custom/menu";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { openLink } from "@/lib/open-link";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export type CommunityTemplateRow =
	RouterOutputs["community"]["getCommunityTemplates"]["data"][number];

type Column = ColumnDef<CommunityTemplateRow>;

export function getCommunityTemplateRowId(template: CommunityTemplateRow) {
	return String(template.id);
}

function getTemplateHref(template: CommunityTemplateRow) {
	return `/community/community-template/${template.slug?.toLowerCase()}/v1`;
}

const modelColumn: Column = {
	id: "model",
	header: "Model",
	accessorFn: (row) => row.modelName,
	size: 320,
	minSize: 240,
	maxSize: 440,
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Model",
		sortField: "modelName",
		className:
			"w-[320px] min-w-[240px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => {
		const template = row.original;
		const modelName = template.modelName || "Untitled model";

		return (
			<Link
				href={getTemplateHref(template)}
				className="flex min-w-0 flex-col gap-1"
				onClick={(event) => event.stopPropagation()}
			>
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={modelName}
				/>
				<span className="font-mono text-xs text-muted-foreground">
					#{template.id} · {formatDate(template.createdAt)}
				</span>
			</Link>
		);
	},
};

const projectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.project?.title,
	size: 280,
	minSize: 220,
	maxSize: 420,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Project",
		className: "w-[280px] min-w-[220px]",
	},
	cell: ({ row }) => {
		const project = row.original.project;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={project?.title || "No project"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{project?.builder?.name || "No builder"}
				</p>
			</div>
		);
	},
};

const unitsColumn: Column = {
	id: "units",
	header: "Units",
	accessorFn: (row) => row._count?.homes ?? 0,
	size: 120,
	minSize: 100,
	maxSize: 160,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-10" },
		headerLabel: "Units",
		className: "w-[120px] min-w-[100px]",
	},
	cell: ({ row }) => {
		const template = row.original;
		const href = `/community/project-units?projectSlug=${template.project?.slug}&q=${encodeURIComponent(template.modelName)}`;

		return (
			<Link
				href={href}
				className="font-mono text-sm font-medium hover:underline"
				onClick={(event) => event.stopPropagation()}
			>
				{template._count?.homes ?? 0}
			</Link>
		);
	},
};

const modelCostColumn: Column = {
	id: "modelCost",
	header: "Model Cost",
	size: 170,
	minSize: 150,
	maxSize: 220,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Model Cost",
		className: "w-[170px] min-w-[150px]",
	},
	cell: ({ row }) => <ModelCostCell template={row.original} />,
};

const installCostColumn: Column = {
	id: "installCost",
	header: "Install Cost",
	size: 190,
	minSize: 160,
	maxSize: 240,
	enableResizing: true,
	meta: {
		skeleton: { type: "button", width: "w-28" },
		headerLabel: "Install Cost",
		className: "w-[190px] min-w-[160px]",
	},
	cell: ({ row }) => <InstallCostCell template={row.original} />,
};

const configuredColumn: Column = {
	id: "configured",
	header: "Configured",
	accessorFn: (row) => row.templateSummary?.configuredCount ?? 0,
	size: 140,
	minSize: 120,
	maxSize: 180,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Configured",
		className: "w-[140px] min-w-[120px]",
	},
	cell: ({ row }) => {
		const summary = row.original.templateSummary;
		const configuredCount = summary?.configuredCount ?? 0;

		return (
			<Badge variant={configuredCount > 0 ? "secondary" : "outline"}>
				{configuredCount > 0 ? `${configuredCount} fields` : "Missing"}
			</Badge>
		);
	},
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
	cell: ({ row }) => <Actions template={row.original} />,
};

function ModelCostCell({ template }: { template: CommunityTemplateRow }) {
	const { setParams } = useCommunityModelCostParams();
	const cost = template.costs?.find((item) => item.current);
	const value = Number(cost?.meta?.grandTotal || 0);

	return (
		<button
			type="button"
			className="text-left"
			onClick={(event) => {
				event.stopPropagation();
				setParams({
					editModelCostTemplateId: template.id,
					editModelCostId: template.pivot?.modelCosts?.[0]?.id || -1,
				});
			}}
		>
			{cost ? (
				<div className="space-y-1">
					<p className="font-medium">{formatCurrency.format(value)}</p>
					{template.costs?.length ? (
						<p className="text-xs text-muted-foreground">
							{template.costs.length} cost history
						</p>
					) : null}
				</div>
			) : (
				<Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
					Set Cost
				</Badge>
			)}
		</button>
	);
}

function InstallCostCell({ template }: { template: CommunityTemplateRow }) {
	const { setParams } = useCommunityInstallCostParams();
	const summary = template.installCostV2Summary;
	const completionRatio = Math.max(
		0,
		Math.min(1, summary?.completionRatio ?? 0),
	);
	const backgroundOpacity = +(0.18 + completionRatio * 0.72).toFixed(2);
	const totalEstimate = summary?.totalEstimate ?? 0;
	const configuredTasks = summary?.configuredBuilderTasks ?? 0;
	const totalTasks = summary?.totalBuilderTasks ?? 0;
	const tooltipTasks = summary?.tasks ?? [];

	return (
		<TooltipProvider delayDuration={100}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							setParams({
								editCommunityModelInstallCostId: template.id,
								mode: "v2",
							});
						}}
						size="sm"
						variant="outline"
						className={cn(
							"min-w-[112px] justify-center border-emerald-700/20 font-semibold shadow-none transition-colors",
							completionRatio > 0.5
								? "text-white hover:text-white"
								: "text-emerald-950 hover:text-emerald-950",
						)}
						style={{
							backgroundColor: `rgba(34, 197, 94, ${backgroundOpacity})`,
							borderColor: `rgba(21, 128, 61, ${Math.max(
								0.2,
								completionRatio,
							)})`,
						}}
					>
						{formatCurrency.format(totalEstimate)}
					</Button>
				</TooltipTrigger>
				<TooltipContent className="max-w-72 space-y-2">
					<div className="space-y-1">
						<p className="text-sm font-semibold">
							{configuredTasks} of {totalTasks} builder tasks configured
						</p>
						<p className="text-xs text-muted-foreground">
							Total qty: {summary?.totalQty ?? 0}
						</p>
						<p className="text-xs text-muted-foreground">
							Total estimate: {formatCurrency.format(totalEstimate)}
						</p>
					</div>
					<div className="space-y-1">
						{tooltipTasks.length ? (
							tooltipTasks.map((task) => (
								<div
									key={task.taskId}
									className="flex items-center justify-between gap-3 text-xs"
								>
									<span className="truncate">{task.taskName}</span>
									<span className="shrink-0 text-muted-foreground">
										{task.totalQty} ·{" "}
										{formatCurrency.format(task.totalEstimate)}
									</span>
								</div>
							))
						) : (
							<p className="text-xs text-muted-foreground">
								No builder tasks configured yet.
							</p>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function Actions({ template }: { template: CommunityTemplateRow }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setParams } = useCommunityTemplateParams();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const deleteTemplate = useMutation(
		trpc.community.deleteCommunityTemplate.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.community.getCommunityTemplates.infiniteQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.community.getCommunityTemplateForm.queryKey({
						templateId: template.id,
					}),
				});
				setConfirmOpen(false);
				toast({
					title: "Deleted",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: error.message || "Unable to delete template",
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<>
			<div className="relative z-10 flex justify-end">
				<Menu
					triggerSize="xs"
					Trigger={
						<Button
							type="button"
							className="size-8 p-0"
							variant="ghost"
							onClick={(event) => event.stopPropagation()}
						>
							<Icons.MoreHoriz className="size-4" />
						</Button>
					}
				>
					<Menu.Item
						onClick={() => {
							setParams({
								templateId: template.id,
							});
						}}
					>
						Edit
					</Menu.Item>
					<Menu.Item
						onClick={() => {
							openLink(
								"p/model-template",
								{
									preview: true,
									templateSlug: template.slug,
								},
								true,
							);
						}}
					>
						Preview
					</Menu.Item>
					<Menu.Item
						className="text-destructive focus:text-destructive"
						onClick={() => {
							setConfirmOpen(true);
						}}
					>
						Delete
					</Menu.Item>
				</Menu>
			</div>
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Delete Community Template</AlertDialog.Title>
						<AlertDialog.Description>
							Delete {template.modelName}? Templates linked to units cannot be
							deleted.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							onClick={() => {
								deleteTemplate.mutate({
									templateId: template.id,
								});
							}}
						>
							Delete
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}

export const columns: Column[] = [
	modelColumn,
	projectColumn,
	unitsColumn,
	modelCostColumn,
	installCostColumn,
	configuredColumn,
	actionsColumn,
];

export const communityUnitColumns: Column[] = [
	modelColumn,
	projectColumn,
	unitsColumn,
	modelCostColumn,
	configuredColumn,
	actionsColumn,
];
