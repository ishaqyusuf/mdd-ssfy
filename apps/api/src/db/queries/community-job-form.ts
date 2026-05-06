import type { TRPCContext } from "@api/trpc/init";
import {
	sortBuilderTasks,
	sortInstallCosts,
} from "@api/utils/install-cost-sort";
import type { JobMeta, JobStatus, ProjectMeta } from "@community/types";
import { z } from "zod";

export const getCommunityJobFormSchema = z.object({
	jobId: z.number().optional().nullable(),
	builderTaskId: z.number().optional().nullable(),
	modelId: z.number().optional().nullable(),
	unitId: z.number().optional().nullable(),
	userId: z.number().optional().nullable(),
});
export type GetCommunityJobFormSchema = z.infer<
	typeof getCommunityJobFormSchema
>;

export const getBuilderTasksForProjectSchema = z.object({
	projectId: z.number(),
	homeId: z.number(),
});
export type GetBuilderTasksForProjectSchema = z.infer<
	typeof getBuilderTasksForProjectSchema
>;

type JobFormUnit = {
	lot?: string | number | null;
	block?: string | number | null;
	lotBlock?: string | null;
	modelName?: string | null;
	project?: {
		meta?: unknown;
		title?: string | null;
		builder?: {
			name?: string | null;
		} | null;
	} | null;
} | null;

type JobFormInstallCostModel = {
	id: number;
	title: string;
	unit?: string | null;
	unitCost?: number | null;
};

type JobFormBuilderTaskInstallCost = {
	id: number;
	orderIndex?: number | null;
	createdAt?: Date | null;
	modelInstallTasks?: Array<{
		id?: number | null;
		communityModelId?: number | null;
		installCostModelId?: number | null;
		qty?: number | null;
		status?: string | null;
	}>;
	defaultQty?: number | null;
	installCostModel: JobFormInstallCostModel;
};

type SortableJobFormBuilderTaskInstallCost = JobFormBuilderTaskInstallCost & {
	builderTaskInstallCost: {
		id: number;
		orderIndex: number | null;
		createdAt: Date | null;
	};
};

type JobFormBuilderTask = {
	id: number;
	taskName?: string | null;
	addonPercentage?: number | null;
	builderTaskInstallCosts: JobFormBuilderTaskInstallCost[];
} | null;

type JobFormJob = {
	id?: number | null;
	amount?: number | null;
	description?: string | null;
	meta?: unknown;
	adminNote?: string | null;
	isCustom?: boolean | null;
	title?: string | null;
	subtitle?: string | null;
	status?: string | null;
	jobInstallTasks: Array<{
		id?: number | null;
		communityModelInstallTaskId?: number | null;
		qty?: number | null;
		maxQty?: number | null;
		rate?: number | null;
	}>;
	user?: {
		id?: number | null;
		name?: string | null;
	} | null;
} | null;

export async function getCommunityJobForm(
	ctx: TRPCContext,
	input: GetCommunityJobFormSchema,
) {
	const { jobId, builderTaskId, modelId } = input;
	const { db } = ctx;
	const unit = (await db.homes.findFirst({
		where: {
			id: input.unitId ?? undefined,
		},
		select: {
			lot: true,
			block: true,
			modelName: true,
			lotBlock: true,
			project: {
				select: {
					meta: true,
					title: true,
					builder: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	})) as JobFormUnit;
	const projectAddon = (unit?.project?.meta as ProjectMeta | null | undefined)
		?.addon;
	const builderTask =
		builderTaskId && builderTaskId > 0
			? ((await db.builderTask.findFirst({
					where: {
						id: builderTaskId,
						installable: true,
						deletedAt: null,
					},
					select: {
						id: true,
						taskIndex: true,
						createdAt: true,
						taskName: true,
						addonPercentage: true,
						builderTaskInstallCosts: {
							select: {
								id: true,
								orderIndex: true,
								createdAt: true,
								modelInstallTasks: {
									where: {
										communityModelId: modelId ?? undefined,
									},
									select: {
										id: true,
										communityModelId: true,
										installCostModelId: true,
										qty: true,
										status: true,
									},
								},
								defaultQty: true,
								installCostModel: {
									select: {
										id: true,
										title: true,
										unit: true,
										unitCost: true,
									},
								},
							},
						},
					},
				})) as JobFormBuilderTask)
			: null;
	const job = (await db.jobs.findFirst({
		where: {
			id: jobId ?? -1,
		},
		select: {
			amount: true,
			description: true,
			meta: true,
			id: true,
			adminNote: true,
			isCustom: true,
			note: true,
			title: true,
			subtitle: true,
			type: true,
			status: true,
			jobInstallTasks: {
				select: {
					id: true,
					communityModelInstallTaskId: true,
					qty: true,
					maxQty: true,
					rate: true,
				},
			},
			user: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	})) as JobFormJob;
	const sortedBuilderTaskInstallCosts = builderTask
		? sortInstallCosts(
				builderTask.builderTaskInstallCosts.map((cost) => ({
					...cost,
					builderTaskInstallCost: {
						id: cost.id,
						orderIndex: cost.orderIndex ?? null,
						createdAt: cost.createdAt ?? null,
					},
				})) satisfies SortableJobFormBuilderTaskInstallCost[],
			)
		: [];
	const jobTasks = sortedBuilderTaskInstallCosts
		?.map((taskInstallCost) => {
			const modelInstallTask = taskInstallCost.modelInstallTasks?.find(
				(mit) => mit.installCostModelId === taskInstallCost.installCostModel.id,
			);
			const modelTaskId = modelInstallTask?.id;
			const jobTask = job?.jobInstallTasks.find(
				(jt) => jt.communityModelInstallTaskId === modelTaskId,
			);
			return {
				id: jobTask?.id,
				qty: jobTask?.qty ?? null,
				maxQty: jobTask?.maxQty || modelInstallTask?.qty,
				rate: jobTask?.rate || taskInstallCost.installCostModel.unitCost,
				installCostModel: taskInstallCost.installCostModel,
				modelTaskId,
				title: taskInstallCost.installCostModel.title,
			};
		})
		.filter((a) => a.maxQty && a.modelTaskId);
	const user = await db.users.findFirst({
		where: {
			id: input.userId ?? ctx.userId ?? -1,
		},
		select: {
			name: true,
			id: true,
		},
	});
	const jobMeta = ((job?.meta as JobMeta | null | undefined) || {
		addonPercent: builderTask?.addonPercentage,
		addon: projectAddon,
	}) as JobMeta;
	return {
		unit: {
			lot: unit?.lot,
			block: unit?.block,
			lotBlock: unit?.lotBlock,
			modelName: unit?.modelName,
			projectTitle: unit?.project?.title,
			builderName: unit?.project?.builder?.name,
			projectAddon,
			taskName: builderTask?.taskName,
		},
		builderTaskId,
		user: job?.user || user,
		job: {
			tasks: jobTasks,
			id: job?.id,
			amount: job?.amount,
			description: job?.description,
			meta: jobMeta,
			title:
				job?.title ||
				[unit?.project?.title, unit?.lotBlock]?.filter(Boolean)?.join(" - "),
			subtitle:
				job?.subtitle ||
				[unit?.modelName, builderTask?.taskName].filter(Boolean).join(" - "),
			adminNote: job?.adminNote,
			isCustom: !!job?.isCustom || !builderTaskId,
			status: (job?.status || "Assigned") as JobStatus,
		},
	};
}

export async function getBuilderTasksForProject(
	ctx: TRPCContext,
	input: GetBuilderTasksForProjectSchema,
) {
	const { projectId } = input;
	const { db } = ctx;
	const tasks = await db.builderTask.findMany({
		where: {
			deletedAt: null,
			installable: true,
			builder: {
				projects: {
					some: {
						id: projectId,
					},
				},
			},
		},
		select: {
			id: true,
			taskName: true,
			taskIndex: true,
			createdAt: true,
		},
	});

	return sortBuilderTasks(tasks).map((task) => ({
		id: task.id,
		taskName: task.taskName,
	}));
}
