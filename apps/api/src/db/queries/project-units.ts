import type { TRPCContext } from "@api/trpc/init";
import { isCommunityUnitRequest } from "@api/utils/community-unit-access";
import type { CommunityTemplateMeta } from "@community/types";
import { getUnitProductionStatus, projectUnitsSelect } from "@community/utils";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
export const invoiceFilter = [
	//   "part paid",
	//   "full paid",
	"no payment",
	"has payment",
] as const;
export type INVOICE_TYPES = (typeof invoiceFilter)[number];

export const communityProductionFilter = [
	"started",
	"queued",
	"idle",
	"completed",
	"sort",
] as const;
export type CommunityProductionFilter =
	(typeof communityProductionFilter)[number];
export const communityInstllationFilters = [
	"Submitted",
	"No Submission",
] as const;
export type CommunityInstllationFilters =
	(typeof communityInstllationFilters)[number];
export const communityInstallCostFilters = [
	"has install cost",
	"no install cost",
] as const;
export type CommunityInstallCostFilters =
	(typeof communityInstallCostFilters)[number];
export const getProjectUnitsSchema = z
	.object({
		builderSlug: z.string().optional().nullable(),
		projectSlug: z.string().optional().nullable(),
		production: z.enum(communityProductionFilter).optional().nullable(),
		invoice: z.enum(invoiceFilter).optional().nullable(),
		installation: z.enum(communityInstllationFilters).optional().nullable(),
		installCost: z.enum(communityInstallCostFilters).optional().nullable(),
		dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetProjectUnitsSchema = z.infer<typeof getProjectUnitsSchema>;

type ProjectUnitTemplate = {
	id?: number | null;
	meta?: unknown;
	project?: {
		builder?: {
			tasks?: Array<{
				id: number;
				taskName: string;
				installable?: boolean | null;
			}>;
		} | null;
	} | null;
	communityModelInstallTasks?: Array<{
		builderTaskId?: number | null;
		qty?: number | null;
		installCostModel?: {
			unitCost?: number | null;
		} | null;
	}>;
} | null;

const projectUnitsListSelect = {
	id: true,
	createdAt: true,
	lotBlock: true,
	lot: true,
	block: true,
	modelName: true,
	slug: true,
	communityTemplateId: true,
	projectId: true,
	homeTemplateId: true,
	tasks: projectUnitsSelect.tasks,
	_count: projectUnitsSelect._count,
	communityTemplate: {
		select: {
			slug: true,
			version: true,
			id: true,
			meta: true,
			project: {
				select: {
					builder: {
						select: {
							tasks: {
								select: {
									id: true,
									taskName: true,
									installable: true,
								},
							},
						},
					},
				},
			},
			communityModelInstallTasks: {
				select: {
					builderTaskId: true,
					qty: true,
					installCostModel: {
						select: {
							unitCost: true,
						},
					},
				},
			},
		},
	},
	project: projectUnitsSelect.project,
} satisfies Prisma.HomesSelect;

function isConfiguredTemplateValue(value: unknown) {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (typeof value === "number") return value > 0;
	if (typeof value === "boolean") return value;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

function countConfiguredDesignValues(value: unknown): number {
	if (value === null || value === undefined) return 0;
	if (Array.isArray(value)) {
		return value.reduce(
			(sum, entry) => sum + countConfiguredDesignValues(entry),
			0,
		);
	}
	if (typeof value === "object") {
		return Object.values(value as Record<string, unknown>).reduce<number>(
			(sum, entry) => sum + countConfiguredDesignValues(entry),
			0,
		);
	}

	return isConfiguredTemplateValue(value) ? 1 : 0;
}

function getInstallCostSummary(
	template: ProjectUnitTemplate | null | undefined,
) {
	if (!template?.id) {
		return {
			status: "missing" as const,
			totalEstimate: 0,
			configuredTasks: 0,
			totalTasks: 0,
		};
	}

	const installableTasks = (template.project?.builder?.tasks || []).filter(
		(task) => !!task.installable,
	);
	const taskMap = new Map<number, number>();

	for (const installTask of template.communityModelInstallTasks || []) {
		if (!installTask.builderTaskId) continue;
		const qty = Number(installTask.qty || 0);
		const unitCost = Number(installTask.installCostModel?.unitCost || 0);
		if (qty <= 0 || unitCost <= 0) continue;
		const current = taskMap.get(installTask.builderTaskId) || 0;
		taskMap.set(
			installTask.builderTaskId,
			+(current + qty * unitCost).toFixed(2),
		);
	}

	const configuredTasks = taskMap.size;
	const totalTasks = installableTasks.length;
	const totalEstimate = +Array.from(taskMap.values())
		.reduce((sum, value) => sum + value, 0)
		.toFixed(2);

	return {
		status:
			totalTasks === 0
				? ("not-required" as const)
				: configuredTasks >= totalTasks
					? ("ready" as const)
					: configuredTasks > 0
						? ("partial" as const)
						: ("missing" as const),
		totalEstimate,
		configuredTasks,
		totalTasks,
	};
}

function getTemplateSummary(template: ProjectUnitTemplate | null | undefined) {
	if (!template?.id) {
		return {
			status: "missing" as const,
			configuredCount: 0,
		};
	}

	const design = (template.meta as CommunityTemplateMeta | null)?.design;
	const configuredCount = countConfiguredDesignValues(design);

	return {
		status: configuredCount > 0 ? ("ready" as const) : ("missing" as const),
		configuredCount,
	};
}

export async function getProjectUnits(
	ctx: TRPCContext,
	query: GetProjectUnitsSchema,
) {
	const { db } = ctx;
	const hideInstallCost = await isCommunityUnitRequest(ctx);
	const model = db.homes;
	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereProjectUnits(query),
		model,
		{
			sortFn,
		},
	);

	const data = await model.findMany({
		where,
		...searchMeta,
		select: projectUnitsListSelect,
	});

	return await response(
		data.map((d) => {
			const { tasks, _count, communityTemplate, ...unitData } = d;
			const production = getUnitProductionStatus(d);
			const installCostSummary = hideInstallCost
				? null
				: getInstallCostSummary(communityTemplate);
			const templateSummary = getTemplateSummary(communityTemplate);

			return {
				...unitData,
				jobCount: _count?.jobs,
				production,
				installCostSummary,
				templateSummary,
				template: {
					...communityTemplate,
					version: (communityTemplate?.version || "v1") as "v1" | "v2",
				},
			};
		}),
	);
}
function sortFn(
	sort,
	sortOrder,
):
	| Prisma.HomesOrderByWithRelationInput
	| Prisma.HomesOrderByWithRelationInput[]
	| undefined {
	switch (sort) {
		case "project":
			return {
				project: {
					title: sortOrder || "asc",
				},
			};
		case "date":
			return {
				createdAt: sortOrder || "desc",
			};
		case "lotBlock":
			return [
				{
					lot: sortOrder || "asc",
				},
				{
					block: sortOrder || "asc",
				},
			];
	}

	return undefined;
}
export function whereProjectUnits(query: Partial<GetProjectUnitsSchema>) {
	const where: Prisma.HomesWhereInput[] = [];
	for (const [k, v] of Object.entries(query)) {
		if (!v) continue;

		switch (k as keyof GetProjectUnitsSchema) {
			case "q": {
				const q = { contains: v as string };
				where.push({
					OR: [
						{
							search: q,
						},
						{
							modelName: q,
						},
					],
				});
				break;
			}
			case "projectSlug":
				where.push({
					project: {
						slug: v as string,
					},
				});
				break;
			case "builderSlug":
				where.push({
					project: {
						builder: {
							slug: v as string,
						},
					},
				});
				break;
			case "invoice":
				switch (query.invoice) {
					case "has payment":
						where.push({
							tasks: {
								some: {
									taskUid: {
										not: null,
									},
									amountPaid: {
										gt: 0,
									},
								},
							},
						});
						break;
					case "no payment":
						where.push({
							tasks: {
								every: {
									taskUid: {
										not: null,
									},
									OR: [
										{
											amountPaid: {
												equals: 0,
											},
										},
										{
											amountPaid: null,
										},
										{
											amountPaid: undefined,
										},
									],
								},
							},
						});
						break;
				}
				break;
			case "installCost":
				switch (query.installCost) {
					case "has install cost":
						where.push({
							communityTemplate: {
								communityModelInstallTasks: {
									some: {
										qty: {
											gt: 0,
										},
										installCostModel: {
											unitCost: {
												gt: 0,
											},
										},
									},
								},
							},
						});
						break;
					case "no install cost":
						where.push({
							OR: [
								{
									communityTemplate: null,
								},
								{
									communityTemplate: {
										communityModelInstallTasks: {
											none: {
												qty: {
													gt: 0,
												},
												installCostModel: {
													unitCost: {
														gt: 0,
													},
												},
											},
										},
									},
								},
							],
						});
						break;
				}
				break;
			case "dateRange":
				where.push({
					createdAt: transformFilterDateToQuery(query.dateRange),
				});
				break;
		}
	}
	return composeQuery(where);
}
