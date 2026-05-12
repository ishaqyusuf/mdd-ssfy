import type { TRPCContext } from "@api/trpc/init";
import { isCommunityUnitRequest } from "@api/utils/community-unit-access";
import type { CommunityTemplateMeta } from "@community/types";
import { projectUnitsSelect } from "@community/utils";
import type { Prisma } from "@gnd/db";
import { formatDate } from "@gnd/utils/dayjs";
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
	"has installation",
	"no installation",
	"Submitted",
	"No Submission",
] as const;
export type CommunityInstllationFilters =
	(typeof communityInstllationFilters)[number];
export const communityInstallCostFilters = [
	"configured",
	"part configured",
	"not configured",
	"has install cost",
	"no install cost",
] as const;
export type CommunityInstallCostFilters =
	(typeof communityInstallCostFilters)[number];
export const communityTemplateConfigFilters = [
	"configured",
	"not configured",
] as const;
export type CommunityTemplateConfigFilters =
	(typeof communityTemplateConfigFilters)[number];
export const getProjectUnitsSchema = z
	.object({
		builderSlug: z.string().optional().nullable(),
		projectSlug: z.string().optional().nullable(),
		template: z.enum(communityTemplateConfigFilters).optional().nullable(),
		production: z.enum(communityProductionFilter).optional().nullable(),
		invoice: z.enum(invoiceFilter).optional().nullable(),
		installation: z.enum(communityInstllationFilters).optional().nullable(),
		installCost: z.enum(communityInstallCostFilters).optional().nullable(),
		dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetProjectUnitsSchema = z.infer<typeof getProjectUnitsSchema>;

function buildProjectUnitsListSelect(hideInstallCost: boolean) {
	return {
		id: true,
		createdAt: true,
		lotBlock: true,
		lot: true,
		block: true,
		modelName: true,
		slug: true,
		communityTemplateId: true,
		tasks: projectUnitsSelect.tasks,
		_count: projectUnitsSelect._count,
		communityTemplate: {
			select: {
				slug: true,
				version: true,
				id: true,
				meta: true,
				templateValues: {
					where: {
						deletedAt: null,
					},
					select: {
						value: true,
						inventoryId: true,
						inventoryCategoryId: true,
					},
				},
				...(hideInstallCost
					? {}
					: {
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
						}),
			},
		},
		project: {
			select: {
				title: true,
				builder: {
					select: {
						name: true,
					},
				},
			},
		},
	} satisfies Prisma.HomesSelect;
}

function getProjectUnitProductionStatus(home: {
	id: number;
	tasks: Array<{
		produceable?: boolean | null;
		sentToProductionAt?: Date | null;
		producedAt?: Date | null;
		productionDueDate?: Date | null;
	}>;
	_count?: {
		jobs?: number | null;
	} | null;
}) {
	const prod = home.tasks.filter((task) => task.produceable);
	const produceables = prod.length;
	const hasJob = Number(home?._count?.jobs || 0);
	let produced = prod.filter((task) => task.producedAt).length;
	let prodDate: Date | null = prod.find((task) => task.productionDueDate)
		?.productionDueDate || null;
	let productionStatus = "Idle";
	const sent = prod.filter((task) => task.sentToProductionAt).length;

	if (hasJob) produced = prod.length;
	if (sent > 0) productionStatus = "Queued";
	if (produced > 0) {
		productionStatus = "Started";
		if (produced === produceables) {
			productionStatus = "Completed";
			prodDate = prod.find((task) => task.producedAt)?.producedAt || prodDate;
		}
	}
	if (hasJob) {
		productionStatus = "Completed";
		prodDate = prod.find((task) => task.producedAt)?.producedAt || prodDate;
	}

	return {
		date: prodDate ? formatDate(prodDate) : null,
		produceables,
		produced,
		pendings: produceables - produced,
		status: productionStatus,
	};
}

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
	template: any,
) {
	const status = getProjectUnitInstallCostStatus(template);

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
			status === "not configured" && totalTasks === 0
				? ("not-required" as const)
				: status === "configured"
					? ("ready" as const)
					: status === "part configured"
						? ("partial" as const)
						: ("missing" as const),
		totalEstimate,
		configuredTasks,
		totalTasks,
	};
}

export function getProjectUnitTemplateStatus(template: any) {
	if (!template?.id) {
		return "not configured" as const;
	}

	const design = (template.meta as CommunityTemplateMeta | null)?.design;
	const configuredCount = countConfiguredDesignValues(design);
	const templateValueCount = (template.templateValues || []).filter(
		(value) =>
			isConfiguredTemplateValue(value?.value) ||
			value?.inventoryId ||
			value?.inventoryCategoryId,
	).length;

	return configuredCount + templateValueCount > 0
		? ("configured" as const)
		: ("not configured" as const);
}

function getTemplateSummary(template: any) {
	if (!template?.id) {
		return {
			status: "missing" as const,
			configuredCount: 0,
		};
	}

	const design = (template.meta as CommunityTemplateMeta | null)?.design;
	const configuredCount = countConfiguredDesignValues(design);
	const templateValueCount = (template.templateValues || []).filter(
		(value) =>
			isConfiguredTemplateValue(value?.value) ||
			value?.inventoryId ||
			value?.inventoryCategoryId,
	).length;

	return {
		status:
			configuredCount + templateValueCount > 0
				? ("ready" as const)
				: ("missing" as const),
		configuredCount: configuredCount + templateValueCount,
	};
}

export function getProjectUnitInstallCostStatus(template: any) {
	if (!template?.id) return "not configured" as const;

	const installableTasks = (template.project?.builder?.tasks || []).filter(
		(task) => !!task.installable,
	);
	const installableTaskIds = new Set<number>(
		installableTasks
			.map((task) => Number(task.id))
			.filter((taskId) => Number.isFinite(taskId)),
	);
	const configuredTaskIds = new Set<number>();

	for (const installTask of template.communityModelInstallTasks || []) {
		if (!installTask.builderTaskId) continue;
		if (!installableTaskIds.has(installTask.builderTaskId)) continue;
		const qty = Number(installTask.qty || 0);
		const unitCost = Number(installTask.installCostModel?.unitCost || 0);
		if (qty <= 0 || unitCost <= 0) continue;
		configuredTaskIds.add(installTask.builderTaskId);
	}

	if (installableTasks.length === 0 || configuredTaskIds.size === 0) {
		return "not configured" as const;
	}

	if (configuredTaskIds.size >= installableTasks.length) {
		return "configured" as const;
	}

	return "part configured" as const;
}

function normalizeTemplateFilter(value: unknown) {
	if (value === "configured") return "configured" as const;
	if (value === "not configured") return "not configured" as const;
	return null;
}

function normalizeInstallCostFilter(value: unknown) {
	if (value === "configured" || value === "has install cost") {
		return "configured" as const;
	}
	if (value === "part configured") return "part configured" as const;
	if (value === "not configured" || value === "no install cost") {
		return "not configured" as const;
	}
	return null;
}

function normalizeInstallationFilter(value: unknown) {
	if (value === "has installation" || value === "Submitted") {
		return "has installation" as const;
	}
	if (value === "no installation" || value === "No Submission") {
		return "no installation" as const;
	}
	return null;
}

async function getProjectUnitConfigurationWhere(
	ctx: TRPCContext,
	query: Partial<GetProjectUnitsSchema>,
) {
	const where: Prisma.HomesWhereInput[] = [];
	const templateFilter = normalizeTemplateFilter(query.template);
	const installCostFilter = normalizeInstallCostFilter(query.installCost);

	if (!templateFilter && !installCostFilter) {
		return undefined;
	}

	const templates = await ctx.db.communityModels.findMany({
		select: {
			id: true,
			meta: true,
			templateValues: {
				where: {
					deletedAt: null,
				},
				select: {
					value: true,
					inventoryId: true,
					inventoryCategoryId: true,
				},
			},
			project: {
				select: {
					builder: {
						select: {
							tasks: {
								select: {
									id: true,
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
	});

	if (templateFilter) {
		const ids = templates
			.filter(
				(template) => getProjectUnitTemplateStatus(template) === templateFilter,
			)
			.map((template) => template.id);

		where.push(
			templateFilter === "not configured"
				? {
						OR: [
							{
								communityTemplateId: null,
							},
							{
								communityTemplateId: {
									in: ids,
								},
							},
						],
					}
				: {
						communityTemplateId: {
							in: ids,
						},
					},
		);
	}

	if (installCostFilter) {
		const ids = templates
			.filter(
				(template) =>
					getProjectUnitInstallCostStatus(template) === installCostFilter,
			)
			.map((template) => template.id);

		where.push(
			installCostFilter === "not configured"
				? {
						OR: [
							{
								communityTemplateId: null,
							},
							{
								communityTemplateId: {
									in: ids,
								},
							},
						],
					}
				: {
						communityTemplateId: {
							in: ids,
						},
					},
		);
	}

	return composeQuery(where);
}

export async function buildProjectUnitsWhere(
	ctx: TRPCContext,
	query: Partial<GetProjectUnitsSchema>,
) {
	return composeQuery(
		[
			whereProjectUnits(query),
			await getProjectUnitConfigurationWhere(ctx, query),
		].filter(Boolean) as Prisma.HomesWhereInput[],
	);
}

export async function getProjectUnits(
	ctx: TRPCContext,
	query: GetProjectUnitsSchema,
) {
	const { db } = ctx;
	const hideInstallCost = await isCommunityUnitRequest(ctx);
	const model = db.homes;
	const projectUnitsWhere = await buildProjectUnitsWhere(ctx, query);
	const { response, searchMeta, where } = await composeQueryData(
		query,
		projectUnitsWhere,
		model,
		{
			sortFn,
		},
	);

	const data = await model.findMany({
		where,
		...searchMeta,
		select: buildProjectUnitsListSelect(hideInstallCost),
	});
	const installCostSummaryByTemplateId = new Map<
		number,
		ReturnType<typeof getInstallCostSummary>
	>();
	const templateSummaryByTemplateId = new Map<
		number,
		ReturnType<typeof getTemplateSummary>
	>();

	return await response(
		data.map((d) => {
			const { tasks, _count, communityTemplate, ...unitData } = d;
			const production = getProjectUnitProductionStatus({
				id: d.id,
				tasks,
				_count,
			});
			const templateId = communityTemplate?.id ?? null;
			let installCostSummary: ReturnType<typeof getInstallCostSummary> | null =
				null;
			let templateSummary = getTemplateSummary(null);

			if (templateId) {
				if (!templateSummaryByTemplateId.has(templateId)) {
					templateSummaryByTemplateId.set(
						templateId,
						getTemplateSummary(communityTemplate),
					);
				}
				templateSummary = templateSummaryByTemplateId.get(templateId)!;

				if (!hideInstallCost) {
					if (!installCostSummaryByTemplateId.has(templateId)) {
						installCostSummaryByTemplateId.set(
							templateId,
							getInstallCostSummary(communityTemplate),
						);
					}
					installCostSummary = installCostSummaryByTemplateId.get(templateId)!;
				}
			}

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
						{
							lotBlock: q,
						},
						{
							project: {
								title: q,
							},
						},
						{
							project: {
								builder: {
									name: q,
								},
							},
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
			case "installation":
				switch (normalizeInstallationFilter(v)) {
					case "has installation":
						where.push({
							jobs: {
								some: {},
							},
						});
						break;
					case "no installation":
						where.push({
							jobs: {
								none: {},
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
