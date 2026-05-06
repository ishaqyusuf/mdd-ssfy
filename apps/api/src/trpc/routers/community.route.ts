import {
	buildersList,
	communityDashboardOverview,
	communityDashboardOverviewSchema,
	communityInstallCostForm,
	communityInstallCostFormSchema,
	communityModelCostForm,
	communityModelCostHistory,
	communityModelCostHistorySchema,
	communityProjectOverview,
	communityProjectOverviewSchema,
	communityProjectUnitOverview,
	communityProjectUnitOverviewSchema,
	communityProjectUnitsOverview,
	communityProjectUnitsOverviewSchema,
	communityProjectsOverview,
	communityProjectsOverviewSchema,
	communitySummary,
	communitySummarySchema,
	createCommnunityModelCost,
	deleteCommunityModelCost,
	deleteCommunityModelCostSchema,
	deleteCommunityTemplate,
	deleteUnits,
	deleteUnitsSchema,
	getCommunityProjects,
	getCommunityProjectsSchema,
	getCommunityTemplateForm,
	getCommunityTemplateHistory,
	getCommunityTemplateHistorySchema,
	getProjectForm,
	getProjectFormSchema,
	getProjectUnitPrintPreflight,
	getUnitJobs,
	getUnitJobsSchema,
	projectList,
	projectUnitPrintPreflightSchema,
	saveCommunityModelCost,
	saveCommunityTemplateForm,
	sendProjectUnitsToProduction,
	sendProjectUnitsToProductionSchema,
	updateInstallCost,
	uploadCommunityProjectDocuments,
	uploadCommunityProjectDocumentsSchema,
} from "@api/db/queries/community";
import {
	getCommunityTemplates,
	getCommunityTemplatesSchema,
} from "@api/db/queries/community-template";
import {
	getBuilderTasksForProject,
	getBuilderTasksForProjectSchema,
	getCommunityJobForm,
	getCommunityJobFormSchema,
} from "@api/db/queries/community-job-form";
import {
	getProjectUnits,
	getProjectUnitsSchema,
} from "@api/db/queries/project-units";
import {
	getUnitInvoiceAgingReport,
	getUnitInvoiceAgingReportSchema,
} from "@api/db/queries/unit-invoice-reports";
import {
	deleteUnitInvoiceTasks,
	deleteUnitInvoiceTasksSchema,
	getUnitInvoiceForm,
	getUnitInvoices,
	getUnitInvoicesSchema,
	saveUnitInvoiceForm,
	saveUnitInvoiceFormSchema,
	unitInvoiceFormSchema,
} from "@api/db/queries/unit-invoices";
import {
	getUnitProductionOverview,
	getUnitProductionOverviewSchema,
	getUnitProductionSummary,
	getUnitProductions,
	getUnitProductionsSchema,
} from "@api/db/queries/unit-productions";
import {
	getWorkOrderForm,
	saveWorkOrderForm,
	workOrderFormSchema,
} from "@api/db/queries/work-order";
import {
	communityModelCostFormSchema,
	communityTemplateFormSchema,
	createCommunityModelCostSchema,
	deleteCommunityTemplateSchema,
	saveCommunityModelCostSchema,
	updateInstallCostSchema,
} from "@api/schemas/community";
import { assertInstallCostAccess } from "@api/utils/community-unit-access";
import { buildInstallCostSuggestionsWhere } from "@api/utils/install-cost-suggestions";
import {
	sortBuilderTasks,
	sortInstallCosts,
} from "@api/utils/install-cost-sort";
import { getBuilders, getBuildersSchema } from "@community/builder";
import {
	saveCommunityModel,
	saveCommunityModelLegacy,
	saveCommunityModelLegacySchema,
	saveCommunityModelSchema,
} from "@community/community-model";
import {
	createCommunityTemplateBlock,
	createCommunityTemplateBlockSchema,
	deleteInputInventoryBlock,
	deleteInputInventoryBlockSchema,
	deleteInputSchema,
	deleteInputSchemaSchema,
	getBlockInputs,
	getBlockInputsSchema,
	getCommunityBlockSchema,
	getCommunityBlockSchemaSchema,
	getCommunitySchema,
	getCommunitySchemaSchema,
	getModelTemplate,
	getModelTemplateSchema,
	getTemplateInputListings,
	getTemplateInputListingsSchema,
	saveTemplateInputListing,
	saveTemplateInputListingSchema,
	updateCommunityBlockInput,
	updateCommunityBlockInputAnalytics,
	updateCommunityBlockInputAnalyticsSchema,
	updateCommunityBlockInputSchema,
	updateRecordsIndices,
	updateRecordsIndicesSchema,
} from "@community/community-template-schemas";
import {
	INSTALL_COST_DEFAULT_UNITS,
	type JobFormAction,
} from "@community/constants";
import {
	builderFormSchema,
	communityInstallCostRateSchema,
	jobFormSchema,
} from "@community/schema";
import type { JobStatus } from "@community/types";
import type { Prisma } from "@gnd/db";
import { getSettingAction } from "@gnd/settings";
import {
	consoleLog,
	generateRandomString,
	percentageValue,
	sum,
} from "@gnd/utils";
import { type CommunityBuilderMeta, getPivotModel } from "@gnd/utils/community";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import slugify from "slugify";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

function toSuggestionKey(parts: string[]) {
	return parts
		.filter(Boolean)
		.map((part, index) =>
			index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join("");
}

function addSuggestionValue(
	suggestions: Record<string, Set<string>>,
	keyParts: string[],
	value: unknown,
) {
	if (typeof value !== "string" && typeof value !== "number") return;
	const normalizedValue = String(value).trim().toUpperCase();
	if (!normalizedValue) return;
	const suggestionKey = toSuggestionKey(keyParts);
	if (!suggestionKey) return;
	if (!suggestions[suggestionKey]) {
		suggestions[suggestionKey] = new Set();
	}
	suggestions[suggestionKey].add(normalizedValue);
}

function collectDesignSuggestions(
	suggestions: Record<string, Set<string>>,
	value: unknown,
	keyParts: string[] = [],
) {
	if (value === null || value === undefined) return;

	if (typeof value === "string" || typeof value === "number") {
		addSuggestionValue(suggestions, keyParts, value);
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((item) =>
			collectDesignSuggestions(suggestions, item, keyParts),
		);
		return;
	}

	if (typeof value !== "object") return;

	const objectValue = value as Record<string, unknown>;
	if ("v" in objectValue && keyParts.length > 0) {
		addSuggestionValue(suggestions, keyParts, objectValue.v);
		return;
	}

	Object.entries(objectValue).forEach(([key, nestedValue]) => {
		collectDesignSuggestions(suggestions, nestedValue, [...keyParts, key]);
	});
}

export const communityRouters = createTRPCRouter({
	getDesignKeySuggestions: publicProcedure.query(async (props) => {
		const models = await props.ctx.db.communityModels.findMany({
			where: {
				deletedAt: null,
			},
			select: {
				meta: true,
			},
		});
		const suggestions: Record<string, Set<string>> = {};

		models.forEach((model) => {
			const design = (model.meta as any)?.design;
			collectDesignSuggestions(suggestions, design);
		});

		return Object.fromEntries(
			Object.entries(suggestions).map(([key, values]) => [
				key,
				Array.from(values).sort((a, b) => a.localeCompare(b)),
			]),
		);
	}),
	getCommunityTemplateLegacy: publicProcedure
		.input(z.object({ slug: z.string() }))
		.query(async (props) => {
			const data = await props.ctx.db.communityModels.findUnique({
				where: { slug: props.input.slug },
				select: {
					id: true,
					slug: true,
					modelName: true,
					meta: true,
					version: true,
					pivot: {
						select: {
							modelCosts: {
								take: 1,
								select: { id: true },
							},
						},
					},
				},
			});
			if (!data) throw new Error("Community template not found");
			return {
				...data,
				meta: data.meta as any,
				pivotModelCostId: data.pivot?.modelCosts?.[0]?.id,
			};
		}),
	getCommunityTemplateHistory: publicProcedure
		.input(getCommunityTemplateHistorySchema)
		.query(async (props) => {
			return getCommunityTemplateHistory(props.ctx, props.input);
		}),
	buildersList: publicProcedure.query(async (q) => {
		return buildersList(q.ctx);
	}),
	createCommunityTemplateBlock: publicProcedure
		.input(createCommunityTemplateBlockSchema)
		.mutation(async (props) => {
			return createCommunityTemplateBlock(props.ctx.db, props.input);
		}),
	communityModelCostHistory: publicProcedure
		.input(communityModelCostHistorySchema)
		.query(async (props) => {
			const result = await communityModelCostHistory(props.ctx, props.input);
			return result;
		}),
	communityModelCostForm: publicProcedure
		.input(communityModelCostFormSchema)
		.query(async (props) => {
			const result = await communityModelCostForm(props.ctx, props.input);
			return result;
		}),
	communityInstallCostForm: publicProcedure
		.input(communityInstallCostFormSchema)
		.query(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const result = await communityInstallCostForm(props.ctx, props.input);
			return result;
		}),
	updateInstallCost: publicProcedure
		.input(updateInstallCostSchema)
		.mutation(async (props) => {
			await assertInstallCostAccess(props.ctx);
			return updateInstallCost(props.ctx, props.input);
		}),
	communitySummary: publicProcedure
		.input(communitySummarySchema)
		.query(async (props) => {
			const result = await communitySummary(props.ctx.db, props.input);
			return result;
		}),
	communityDashboardOverview: publicProcedure
		.input(communityDashboardOverviewSchema)
		.query(async (props) => {
			return communityDashboardOverview(props.ctx);
		}),
	communityProjectsOverview: publicProcedure
		.input(communityProjectsOverviewSchema)
		.query(async (props) => {
			return communityProjectsOverview(props.ctx, props.input);
		}),
	communityProjectUnitsOverview: publicProcedure
		.input(communityProjectUnitsOverviewSchema)
		.query(async (props) => {
			return communityProjectUnitsOverview(props.ctx, props.input);
		}),
	communityProjectOverview: publicProcedure
		.input(communityProjectOverviewSchema)
		.query(async (props) => {
			return communityProjectOverview(props.ctx, props.input);
		}),
	uploadCommunityProjectDocuments: publicProcedure
		.input(uploadCommunityProjectDocumentsSchema)
		.mutation(async (props) => {
			return uploadCommunityProjectDocuments(props.ctx, props.input);
		}),
	communityProjectUnitOverview: publicProcedure
		.input(communityProjectUnitOverviewSchema)
		.query(async (props) => {
			return communityProjectUnitOverview(props.ctx, props.input);
		}),
	createCommunityModelCost: publicProcedure
		.input(createCommunityModelCostSchema)
		.mutation(async (props) => {
			return createCommnunityModelCost(props.ctx, props.input);
		}),
	getBuilders: publicProcedure.input(getBuildersSchema).query(async (q) => {
		return getBuilders(q.ctx.db, q.input);
	}),
	getUnitInvoices: publicProcedure
		.input(getUnitInvoicesSchema)
		.query(async (props) => {
			return getUnitInvoices(props.ctx, props.input);
		}),
	getUnitInvoiceAgingReport: publicProcedure
		.input(getUnitInvoiceAgingReportSchema)
		.query(async (props) => {
			return getUnitInvoiceAgingReport(props.ctx, props.input);
		}),
	getUnitInvoiceForm: publicProcedure
		.input(unitInvoiceFormSchema)
		.query(async (props) => {
			return getUnitInvoiceForm(props.ctx, props.input);
		}),
	saveUnitInvoiceForm: publicProcedure
		.input(saveUnitInvoiceFormSchema)
		.mutation(async (props) => {
			return saveUnitInvoiceForm(props.ctx, props.input);
		}),
	deleteUnitInvoiceTasks: publicProcedure
		.input(deleteUnitInvoiceTasksSchema)
		.mutation(async (props) => {
			return deleteUnitInvoiceTasks(props.ctx, props.input);
		}),
	getBuilderForm: publicProcedure
		.input(z.object({ builderId: z.number() }))
		.query(async (props) => {
			const { builderId } = props.input;
			const result = await props.ctx.db.builders.findUnique({
				where: {
					id: builderId,
				},
				select: {
					id: true,
					name: true,
					address: true,
					meta: true,
					tasks: {
						select: {
							id: true,
							addonPercentage: true,
							billable: true,
							installable: true,
							productionable: true,
							taskName: true,
							taskUid: true,
						},
					},
				},
			});
			if (!result) throw new Error("Builder not found");
			const meta: CommunityBuilderMeta = (result.meta as any) || {};
			return {
				isLegacy: !meta.upgraded,
				id: result.id,
				name: result.name,
				address: result.address,
				tasks: result.tasks,
			};
		}),
	/**
	 * COMMUNITY INSTALL COSTS
	 */

	getCommunityInstallCostRates: publicProcedure.query(async (props) => {
		await assertInstallCostAccess(props.ctx);
		const r = await props.ctx.db.installCostModel.findMany({
			where: {
				// status: "active",
			},
			orderBy: {
				title: "asc",
			},
			select: {
				id: true,
				title: true,
				unit: true,
				unitCost: true,
			},
		});
		const legacyCosts =
			r.length > 0
				? []
				: await (async () => {
						const ss = await getSettingAction(
							"install-price-chart",
							props.ctx.db,
						);
						const s = ss?.meta?.list || [];
						return s;
					})();

		return {
			communityInstallCostRates: r,
			legacyCosts,
		};
	}),
	getJobForm: publicProcedure
		.input(getCommunityJobFormSchema)
		.query(async (props) => getCommunityJobForm(props.ctx, props.input)),
	saveJobForm: publicProcedure.input(jobFormSchema).mutation(async (props) => {
		const { ctx, input } = props;
		return ctx.db.$transaction(async (db) => {
			const { unit, user, job: jobInput } = input;
			let jobId = jobInput.id;
			const isCreatingJob = !jobId;
			const previousJob = jobId
				? await db.jobs.findFirst({
						where: {
							id: jobId,
						},
						select: {
							id: true,
							status: true,
							userId: true,
						},
					})
				: null;
			const action = input.action as JobFormAction;
			const resolvedStatus = (() => {
				if (input.requestTaskConfig || action === "request-task-config") {
					return "Config Requested" as JobStatus;
				}
				if (action === "submit") return "Submitted" as JobStatus;
				if (action === "re-assign") return "Assigned" as JobStatus;
				if (action === "approve") return "Approved" as JobStatus;
				if (action === "reject") return "Rejected" as JobStatus;

				return (
					(previousJob?.status as JobStatus | null) ||
					(jobInput.status as JobStatus | null) ||
					(isCreatingJob ? ("Submitted" as JobStatus) : undefined)
				);
			})();

			if (resolvedStatus) {
				jobInput.status = resolvedStatus;
			}
			if (!jobInput.meta) jobInput.meta = {};
			if (jobInput.isCustom) {
				jobInput.meta = {
					...jobInput.meta,
					addon: 0,
					addonPercent: 0,
				};
				jobInput.tasks = [];
			} else {
				jobInput.meta.additional_cost = null;
			}
			// job.meta.addon = percentageValue(job.meta.)
			const totalTaskCost = +(
				jobInput.tasks?.reduce(
					(acc, t) => acc + (t.rate || 0) * (t.qty || 0),
					0,
				) || 0
			).toFixed(2);
			jobInput.amount = sum([
				totalTaskCost,
				jobInput.meta.addon,
				jobInput.meta.additional_cost,
			]);
			const select = {
				id: true,
				project: {
					select: {
						title: true,
						builder: {
							select: { name: true },
						},
					},
				},
				home: { select: { modelName: true, lot: true, block: true } },
				user: {
					select: {
						id: true,
						name: true,
					},
				},
				builderTask: {
					select: {
						taskName: true,
					},
				},
			} satisfies Prisma.JobsSelect;
			let job: Prisma.JobsGetPayload<{
				select: typeof select;
			}> = null as any;
			if (jobId) {
				job = (await db.jobs.update({
					where: {
						id: jobId,
					},
					data: {
						amount: jobInput.amount,
						adminNote: jobInput.adminNote,
						isCustom: jobInput.isCustom,
						title: jobInput.title,
						subtitle: jobInput.subtitle,
						description: jobInput.description,
						status: resolvedStatus || undefined,
						statusDate:
							resolvedStatus && resolvedStatus !== previousJob?.status
								? new Date()
								: undefined,
						// type: job.type,
						meta: jobInput.meta as any,
						user: user?.id ? { connect: { id: user.id } } : undefined,
					},
					select,
				})) as any;
			} else {
				job = (await db.jobs.create({
					data: {
						amount: jobInput.amount,
						description: jobInput.description,
						adminNote: jobInput.adminNote,
						isCustom: jobInput.isCustom,
						title: jobInput.title,
						subtitle: jobInput.subtitle,
						// type: job.type,
						user: { connect: { id: user!.id || props.ctx.userId } },
						home: unit?.id ? { connect: { id: unit.id } } : undefined,
						project: unit?.projectId
							? { connect: { id: unit.projectId } }
							: undefined,
						meta: jobInput.meta as any,
						status: (resolvedStatus || "Submitted") as JobStatus,
						builderTask:
							input?.builderTaskId && input.builderTaskId > 0
								? { connect: { id: input.builderTaskId } }
								: undefined,
					},
					select: {
						...select,
					},
				})) as any;
				jobId = job?.id;
			}

			if (jobInput.id) {
				await db.jobInstallTasks.updateMany({
					where: {
						jobId: jobInput.id,
						id: {
							notIn: jobInput.tasks?.map((t) => t.id!).filter(Boolean) || [],
						},
					},
					data: {
						deletedAt: new Date(),
					},
				});
			}
			await Promise.all([
				...(jobInput.tasks || [])
					.filter((t) => !!t.id)
					.map(async (task) => {
						return db.jobInstallTasks.update({
							where: {
								id: task.id!,
							},
							data: {
								qty: task.qty,
								rate: task.rate,
							},
						});
					}),
				db.jobInstallTasks.createMany({
					data: (jobInput.tasks || [])
						.filter((t) => !t.id)
						.map((task) => ({
							jobId: jobId!,
							qty: task.qty,
							rate: task.rate,
							communityModelInstallTaskId: task.modelTaskId,
							maxQty: task.maxQty,
							total: +((task.rate || 0) * (task.qty || 0)).toFixed(2),
							// jobHomeTaskId
							// communityModelInstallTaskId: task.communityModelInstallTaskId,
						})),
				}),
			]);
			if (isCreatingJob) {
				const notification = new NotificationService(tasks, ctx);

				if (input.requestTaskConfig) {
					if (!input.builderTaskId) {
						throw new Error("builderTaskId is required for requestTaskConfig");
					}
					await notification.channel.jobTaskConfigureRequest({
						contractorId: job?.user?.id!,
						jobId: jobId!,
						modelName: job?.home?.modelName || "",
						projectName: job?.project?.title || "",
						builderName: job?.project?.builder?.name || "",
						modelId: input.modelId,
						builderTaskId: input.builderTaskId!,
						lotBlock: job?.home ? `${job.home.lot}/${job.home.block}` : "",
						taskName: job?.builderTask?.taskName || "",
					});
				} else if (resolvedStatus === "Submitted")
					await notification.channel.jobSubmitted({
						jobId: job?.id!,
					});
				else {
					if (user?.id != null) {
						notification.setEmployeeRecipients(user.id);
					}
					await notification.channel.jobAssigned({
						jobId: job?.id!,
						assignedToId: job?.user?.id!,
						assignedToName: job?.user?.name!,
					});
				}
			} else {
				const notification = new NotificationService(tasks, ctx);
				const nextUserId = job?.user?.id || null;
				const previousUserId = previousJob?.userId || null;
				const nextStatus = resolvedStatus || jobInput.status;
				const previousStatus = previousJob?.status;

				if (
					nextStatus === "Submitted" &&
					previousStatus !== "Submitted" &&
					jobId
				) {
					await notification.channel.jobSubmitted({
						jobId: job?.id!,
					});
				}

				if (nextUserId && previousUserId !== nextUserId && jobId) {
					notification.setEmployeeRecipients(nextUserId);
					await notification.channel.jobAssigned({
						jobId: job?.id!,
						assignedToId: nextUserId,
						assignedToName: job?.user?.name || "",
					});
				}
			}
			return job;
		});
	}),
	getInstallCostRatesSuggestions: publicProcedure
		.input(
			z.object({
				builderTaskId: z.number(),
				modelId: z.number(),
			}),
		)
		.query(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const suggestions = await props.ctx.db.installCostModel.findMany({
				where: buildInstallCostSuggestionsWhere(props.input.builderTaskId),
				orderBy: {
					title: "asc",
				},
				select: {
					id: true,
					title: true,
					unit: true,
					unitCost: true,
				},
			});
			return suggestions;
			// Implementation for getInstallCostRatesSuggestions
		}),
	getInstallCostRateUnits: publicProcedure.query(async (props) => {
		await assertInstallCostAccess(props.ctx);
		const r = await props.ctx.db.installCostModel.findMany({
			where: {
				status: "active",
			},
			select: {
				unit: true,
			},
			distinct: ["unit"],
		});
		const units = [
			...INSTALL_COST_DEFAULT_UNITS,
			...r
				.map((c) => c.unit)
				.filter((u) => u && !INSTALL_COST_DEFAULT_UNITS.includes(u)),
		];
		return units;
	}),
	importLegacyInstallCosts: publicProcedure.mutation(async (props) => {
		await assertInstallCostAccess(props.ctx);
		const ss = await getSettingAction("install-price-chart", props.ctx.db);
		const s = ss?.meta?.list || [];
		const existingCosts = await props.ctx.db.installCostModel.findMany({
			where: {
				status: "active",
			},
		});
		const existingTitles = existingCosts.map((c) => c.title);
		const costsToImport = s.filter((c) => !existingTitles.includes(c.title));
		await props.ctx.db.installCostModel.createMany({
			data: costsToImport.map((cost) => ({
				title: cost.title,
				unit: "PCS",
				unitCost: +cost.cost,
				status: "active",
			})),
		});
		return {
			importedCount: costsToImport.length,
		};
	}),
	updateCommunityModelInstallTask: publicProcedure
		.input(
			z.object({
				id: z.number().optional().nullable(),
				qty: z.number().optional().nullable(),
				builderTaskInstallCostId: z.number().optional().nullable(),
				builderTaskId: z.number(),
				installCostModelId: z.number(),
				communityModelId: z.number(),
				status: z.enum(["active", "inactive"]).optional().default("active"),
			}),
		)
		.mutation(async (props) => {
			await assertInstallCostAccess(props.ctx);
			if (!props.input.builderTaskInstallCostId) {
				const lastInstallCost =
					await props.ctx.db.builderTaskInstallCost.findFirst({
						where: {
							builderTaskId: props.input.builderTaskId,
						},
						orderBy: {
							orderIndex: "desc",
						},
						select: {
							orderIndex: true,
						},
					});
				const r = await props.ctx.db.builderTaskInstallCost.create({
					data: {
						builderTaskId: props.input.builderTaskId,
						installCostModelId: props.input.installCostModelId,
						orderIndex: (lastInstallCost?.orderIndex ?? -1) + 1,
						// communityModelId: props.input.communityModelId,
					},
				});
				props.input.builderTaskInstallCostId = r.id;
			}
			let {
				id,
				qty,
				builderTaskId,
				installCostModelId,
				communityModelId,
				status,
				builderTaskInstallCostId,
			} = props.input;
			const findId = async () => {
				const _id = (
					await props.ctx.db.communityModelInstallTask.findFirst({
						where: {
							builderTaskId,
							communityModelId,
							installCostModelId,
						},
						select: {
							id: true,
						},
					})
				)?.id;
				id = _id;
				return _id;
			};
			if (!id && !(await findId())) {
				const result = await props.ctx.db.communityModelInstallTask.create({
					data: {
						builderTaskId,
						installCostModelId,
						status: status || "active",
						communityModelId,
						builderTaskInstallCostId,
					},
				});
				return result;
			} else {
				const result = await props.ctx.db.communityModelInstallTask.update({
					where: { id: id! },
					data: {
						qty,
						// builderTaskId,
						// installCostModelId,
						status: status || "active",
						// communityModelId,
					},
				});
				return result;
			}
		}),
	deleteCommunityModelInstallCost: publicProcedure
		.input(
			z.object({
				builderTaskInstallCostId: z.number(),
			}),
		)
		.mutation(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const { db } = props.ctx;
			const { builderTaskInstallCostId } = props.input;
			await db.$transaction(async (tx) => {
				const installCost = await tx.builderTaskInstallCost.findUnique({
					where: {
						id: builderTaskInstallCostId,
					},
					select: {
						builderTaskId: true,
					},
				});
				if (!installCost) {
					throw new Error("Install cost row could not be found.");
				}
				await tx.communityModelInstallTask.deleteMany({
					where: {
						builderTaskInstallCostId,
					},
				});
				await tx.builderTaskInstallCost.delete({
					where: {
						id: builderTaskInstallCostId,
					},
				});
				const remainingRows = await tx.builderTaskInstallCost.findMany({
					where: {
						builderTaskId: installCost.builderTaskId,
					},
					orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }, { id: "asc" }],
					select: {
						id: true,
					},
				});
				await Promise.all(
					remainingRows.map((row, index) =>
						tx.builderTaskInstallCost.update({
							where: { id: row.id },
							data: {
								orderIndex: index,
							},
						}),
					),
				);
			});
			return { success: true };
		}),
	reorderBuilderTaskInstallCosts: publicProcedure
		.input(
			z.object({
				builderTaskId: z.number(),
				builderTaskInstallCostIds: z.array(z.number()).min(1),
			}),
		)
		.mutation(async (props) => {
			const { db } = props.ctx;
			const { builderTaskId, builderTaskInstallCostIds } = props.input;
			const existingRows = await db.builderTaskInstallCost.findMany({
				where: {
					builderTaskId,
					id: {
						in: builderTaskInstallCostIds,
					},
				},
				select: {
					id: true,
				},
			});
			const totalRowCount = await db.builderTaskInstallCost.count({
				where: {
					builderTaskId,
				},
			});

			if (
				existingRows.length !== builderTaskInstallCostIds.length ||
				existingRows.length !== totalRowCount
			) {
				throw new Error("Some install cost rows could not be found.");
			}

			await db.$transaction(
				builderTaskInstallCostIds.map((id, index) =>
					db.builderTaskInstallCost.update({
						where: { id },
						data: {
							orderIndex: index,
						},
					}),
				),
			);

			return { ok: true };
		}),
	updateInstallCostRate: publicProcedure
		.input(communityInstallCostRateSchema)
		.mutation(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const { id, title, unit, unitCost } = props.input;
			if (id) {
				return props.ctx.db.installCostModel.update({
					where: { id },
					data: {
						title,
						unit,
						unitCost,
					},
					select: {
						id: true,
						title: true,
						unit: true,
						unitCost: true,
						status: true,
					},
				});
			} else {
				return props.ctx.db.installCostModel.create({
					data: {
						title,
						unit,
						unitCost,
						status: "active",
					},
					select: {
						id: true,
						title: true,
						unit: true,
						unitCost: true,
						status: true,
					},
				});
			}
		}),
	/**
	 *
	 *
	 */
	getProjectForm: publicProcedure
		.input(getProjectFormSchema)
		.query(async (props) => {
			return getProjectForm(props.ctx, props.input);
		}),
	saveTemplateInputListing: publicProcedure
		.input(saveTemplateInputListingSchema)
		.mutation(async (props) => {
			return saveTemplateInputListing(props.ctx.db, props.input);
		}),
	deleteCommunityModelCost: publicProcedure
		.input(deleteCommunityModelCostSchema)
		.mutation(async (props) => {
			return deleteCommunityModelCost(props.ctx, props.input);
		}),
	deleteInputInventoryBlock: publicProcedure
		.input(deleteInputInventoryBlockSchema)
		.mutation(async (props) => {
			return deleteInputInventoryBlock(props.ctx.db, props.input);
		}),
	deleteInputSchema: publicProcedure
		.input(deleteInputSchemaSchema)
		.mutation(async (props) => {
			return deleteInputSchema(props.ctx.db, props.input);
		}),
	deleteUnits: publicProcedure
		.input(deleteUnitsSchema)
		.mutation(async (props) => {
			return deleteUnits(props.ctx, props.input);
		}),
	getProjectUnitPrintPreflight: publicProcedure
		.input(projectUnitPrintPreflightSchema)
		.query(async (props) => {
			return getProjectUnitPrintPreflight(props.ctx, props.input);
		}),
	sendProjectUnitsToProduction: publicProcedure
		.input(sendProjectUnitsToProductionSchema)
		.mutation(async (props) => {
			return sendProjectUnitsToProduction(props.ctx, props.input);
		}),
	getCommunityBlockSchema: publicProcedure
		.input(getCommunityBlockSchemaSchema)
		.query(async (props) => {
			return getCommunityBlockSchema(props.ctx.db, props.input);
		}),
	getBlockInputs: publicProcedure
		.input(getBlockInputsSchema)
		.query(async (props) => {
			return getBlockInputs(props.ctx.db, props.input);
		}),
	getCommunityProjects: publicProcedure
		.input(getCommunityProjectsSchema)
		.query(async (props) => {
			return getCommunityProjects(props.ctx, props.input);
		}),

	getCommunityTemplateForm: publicProcedure
		.input(
			z.object({
				templateId: z.number(),
			}),
		)
		.query(async (props) => {
			return getCommunityTemplateForm(props.ctx, props.input?.templateId);
		}),
	getCommunityTemplates: publicProcedure
		.input(getCommunityTemplatesSchema)
		.query(async (props) => {
			return getCommunityTemplates(props.ctx, props.input);
		}),
	getCommunitySchema: publicProcedure
		.input(getCommunitySchemaSchema)
		.query(async (props) => {
			return getCommunitySchema(props.ctx.db, props.input);
		}),
	getModelTemplate: publicProcedure
		.input(getModelTemplateSchema)
		.query(async (props) => {
			return getModelTemplate(props.ctx.db, props.input);
		}),
	getProjectUnits: publicProcedure
		.input(getProjectUnitsSchema)
		.query(async (props) => {
			return getProjectUnits(props.ctx, props.input);
		}),
	getUnitProductions: publicProcedure
		.input(getUnitProductionsSchema)
		.query(async (props) => {
			return getUnitProductions(props.ctx, props.input);
		}),
	getUnitProductionOverview: publicProcedure
		.input(getUnitProductionOverviewSchema)
		.query(async (props) => {
			return getUnitProductionOverview(props.ctx, props.input);
		}),
	getUnitProductionSummary: publicProcedure
		.input(
			getUnitProductionsSchema.omit({
				cursor: true,
				size: true,
				sort: true,
			}),
		)
		.query(async (props) => {
			return getUnitProductionSummary(props.ctx, props.input);
		}),
	getTemplateInputListings: publicProcedure
		.input(getTemplateInputListingsSchema)
		.query(async (props) => {
			return getTemplateInputListings(props.ctx.db, props.input);
		}),
	projectsList: publicProcedure.query(async (q) => {
		return projectList(q.ctx);
	}),
	getUnitJobs: publicProcedure.input(getUnitJobsSchema).query(async (props) => {
		return getUnitJobs(props.ctx, props.input);
	}),
	getProjectUnitsWithJobStats: publicProcedure
		.input(
			z.object({
				projectId: z.number(),
			}),
		)
		.query(async (props) => {
			const { projectId } = props.input;
			const { db } = props.ctx;
			const units = await db.homes.findMany({
				where: {
					projectId,
				},
				orderBy: {
					modelName: "asc",
					// lot: "asc",
					// block: "asc",
				},
				select: {
					id: true,
					lot: true,
					block: true,
					modelName: true,
					modelNo: true,
					communityTemplate: {
						select: {
							id: true,
						},
					},
					_count: {
						select: {
							jobs: {
								where: {
									deletedAt: null,
								},
							},
						},
					},
					jobs: {
						where: {
							deletedAt: null,
						},
						select: {
							amount: true,
						},
					},
				},
			});
			return units.map((unit) => {
				const totalJobCost = unit.jobs.reduce(
					(acc, job) => acc + job.amount,
					0,
				);
				return {
					id: unit.id,
					lot: unit.lot,
					block: unit.block,
					jobCount: unit._count.jobs,
					totalJobCost,
					modelName: unit.modelName,
					modelNo: unit.modelNo,
					modelId: unit?.communityTemplate?.id!,
				};
			});
		}),
	getBuilderTasksForProject: publicProcedure
		.input(getBuilderTasksForProjectSchema)
		.query(async (props) => getBuilderTasksForProject(props.ctx, props.input)),
	saveCommunityModelCostForm: publicProcedure
		.input(saveCommunityModelCostSchema)
		.mutation(async (props) => {
			const result = await saveCommunityModelCost(props.ctx, props.input);
			return result;
		}),
	saveCommunityTemplateData: publicProcedure
		.input(communityTemplateFormSchema)
		.mutation(async (props) => {
			return saveCommunityTemplateForm(props.ctx, props.input);
		}),
	deleteCommunityTemplate: publicProcedure
		.input(deleteCommunityTemplateSchema)
		.mutation(async (props) => {
			return deleteCommunityTemplate(props.ctx, props.input);
		}),
	saveCommunityModelLegacy: publicProcedure
		.input(saveCommunityModelLegacySchema)
		.mutation(async (props) => {
			return saveCommunityModelLegacy(props.ctx.db, props.input);
		}),
	saveCommunityModel: publicProcedure
		.input(saveCommunityModelSchema)
		.mutation(async (props) => {
			return saveCommunityModel(props.ctx.db, props.input);
		}),
	updateCommunityBlockInput: publicProcedure
		.input(updateCommunityBlockInputSchema)
		.mutation(async (props) => {
			return updateCommunityBlockInput(props.ctx.db, props.input);
		}),
	updateCommunityBlockInputAnalytics: publicProcedure
		.input(updateCommunityBlockInputAnalyticsSchema)
		.mutation(async (props) => {
			return updateCommunityBlockInputAnalytics(props.ctx.db, props.input);
		}),
	updateRecordsIndicesIndices: publicProcedure
		.input(updateRecordsIndicesSchema)
		.mutation(async (props) => {
			return updateRecordsIndices(props.ctx.db, props.input);
		}),
	workOrder: {
		form: publicProcedure.input(z.number()).query(async (props) => {
			const result = await getWorkOrderForm(props.ctx, props.input);
			return result;
		}),
		saveWorkOrderForm: publicProcedure
			.input(workOrderFormSchema)
			.mutation(async (props) => {
				return saveWorkOrderForm(props.ctx, props.input);
			}),
		findHomeOwner: publicProcedure
			.input(
				z.object({
					projectName: z.string(),
					lot: z.string(),
					block: z.string(),
				}),
			)
			.query(async (props) => {
				const { projectName, lot, block } = props.input;
				const w = await props.ctx.db.workOrders.findFirst({
					where: {
						projectName,
						lot,
						block,
					},
				});
				if (w) {
					const { homeAddress, homeOwner, homePhone } = w;
					return {
						homeAddress,
						homeOwner,
						homePhone,
					};
				}

				return {};
			}),
		projectsList: publicProcedure.query(async (props) => {
			const p = await props.ctx.db.projects.findMany({
				where: {},
				orderBy: {
					title: "asc",
				},
				select: {
					id: true,
					title: true,
					homes: {
						select: {
							id: true,
							lot: true,
							block: true,
						},
					},
				},
			});
			return p.map((project) => {
				const homes = project.homes
					.map((unit) => ({
						...unit,
						lotBlock: `${unit.lot || "-"}/${unit.block || "-"}`,
						active: unit.lot && unit.block,
					}))
					.sort((a, b) => a.lotBlock?.localeCompare(b.lotBlock));
				return {
					...project,
					homes,
					active: !!homes.filter((a) => a.active)?.length,
				};
			});
		}),
	},
	saveBuilder: publicProcedure
		.input(builderFormSchema)
		.mutation(async (props) => {
			const { db } = props.ctx;
			const { id, name, address, tasks } = props.input;
			let result;
			console.log({ address });
			if (id) {
				result = await db.builders.update({
					where: { id },
					data: {
						name,
						address,
					},
				});

				const newTasks = tasks.filter((t) => !t.id);
				const existingTasks = tasks.filter((t) => t.id);
				console.log(newTasks);
				await Promise.all([
					...existingTasks.map((t) =>
						db.builderTask.update({
							where: { id: t.id! },
							data: {
								taskName: t.taskName,

								billable: t.billable,
								productionable: t.productionable,
								addonPercentage: t.addonPercentage,
								installable: t.installable,
							},
						}),
					),
					newTasks.length > 0
						? db.builderTask.createMany({
								data: newTasks.map((t) => ({
									builderId: result.id,
									taskName: t.taskName,
									billable: t.billable,
									productionable: t.productionable,
									addonPercentage: t.addonPercentage,
									installable: t.installable,
									taskUid: generateRandomString(5),
								})),
							})
						: null,
				]);
			} else {
				result = await db.builders.create({
					data: {
						name,
						address,
						tasks: {
							create: tasks.map((t) => ({
								taskName: t.taskName,
								billable: t.billable,
								productionable: t.productionable,
								addonPercentage: t.addonPercentage,
								installable: t.installable,
								taskUid: generateRandomString(5),
							})),
						},
					},
				});
			}
			if (!result) throw new Error("Builder not found");
			const meta: CommunityBuilderMeta = (result.meta as any) || {};
			return {
				isLegacy: !meta.upgraded,
				id: result.id,
			};
		}),
	getBuilderTasks: publicProcedure
		.input(z.object({ builderId: z.number() }))
		.query(async (props) => {
			const { db } = props.ctx;
			const { builderId } = props.input;
			const tasks = await db.builderTask.findMany({
				where: {
					builderId,
				},
				include: {},
			});
			return tasks;
		}),
	generateModelForUnit: publicProcedure
		.input(z.object({ unitId: z.number() }))
		.mutation(async (props) => {
			const { db } = props.ctx;
			const { unitId } = props.input;

			const unit = await db.homes.findFirst({
				where: {
					id: unitId,
					deletedAt: null,
				},
				select: {
					id: true,
					projectId: true,
					modelName: true,
					communityTemplateId: true,
					project: {
						select: {
							title: true,
						},
					},
				},
			});

			if (!unit) throw new Error("Unit not found");
			if (!unit.modelName) throw new Error("Unit model is missing");

			if (unit.communityTemplateId) {
				return {
					modelId: unit.communityTemplateId,
					created: false,
				};
			}

			const existingModel = await db.communityModels.findFirst({
				where: {
					projectId: unit.projectId,
					modelName: unit.modelName,
					deletedAt: null,
				},
				select: {
					id: true,
				},
			});

			const ensureModelId = async () => {
				if (existingModel?.id) return existingModel.id;

				const pivotModel = getPivotModel(unit.modelName);
				let pivot = await db.communityModelPivot.findFirst({
					where: {
						model: pivotModel,
						projectId: unit.projectId,
						deletedAt: null,
					},
					select: {
						id: true,
					},
				});
				if (!pivot) {
					pivot = await db.communityModelPivot.create({
						data: {
							model: pivotModel,
							projectId: unit.projectId,
							meta: {},
						},
						select: {
							id: true,
						},
					});
				}

				const baseSlug =
					slugify(`${unit.project?.title || "project"} ${unit.modelName}`, {
						lower: true,
						strict: true,
						trim: true,
					}) || `model-${unit.projectId}-${unit.id}`;

				let slug = baseSlug;
				let attempts = 0;
				while (attempts < 5) {
					const exists = await db.communityModels.findFirst({
						where: {
							slug,
						},
						select: { id: true },
					});
					if (!exists) break;
					attempts += 1;
					slug = `${baseSlug}-${generateRandomString(4).toLowerCase()}`;
				}

				const created = await db.communityModels.create({
					data: {
						slug,
						modelName: unit.modelName!,
						projectId: unit.projectId,
						pivotId: pivot.id,
					},
					select: {
						id: true,
					},
				});
				return created.id;
			};

			const modelId = await ensureModelId();

			await db.homes.updateMany({
				where: {
					projectId: unit.projectId,
					modelName: unit.modelName,
					deletedAt: null,
				},
				data: {
					communityTemplateId: modelId,
				},
			});

			return {
				modelId,
				created: !existingModel?.id,
			};
		}),
	getModelBuilderTasks: publicProcedure
		.input(z.object({ modelId: z.number() }))
		.query(async (props) => {
			const { db } = props.ctx;
			const { modelId } = props.input;
			const model = await db.communityModels.findUnique({
				where: { id: modelId },
				select: {
					modelName: true,
					project: {
						select: {
							title: true,
							builder: {
								select: {
									id: true,
									name: true,

									tasks: {
										select: {
											id: true,
											taskName: true,
											billable: true,
											productionable: true,
											addonPercentage: true,
											installable: true,
											taskIndex: true,
											createdAt: true,
										},
									},
								},
							},
						},
					},
					communityModelInstallTasks: {
						select: {
							builderTaskId: true,
							id: true,
						},
					},
				},
			});
			return {
				builderTasks: sortBuilderTasks(
					(model?.project?.builder?.tasks || [])?.map((task) => {
						const installTasks = model?.communityModelInstallTasks?.filter(
							(t) => t.builderTaskId === task.id,
						);
						const installTask = installTasks?.[0];
						const installTaskCount = installTasks?.length || 0;
						return {
							...task,
							installTaskId: installTask?.id,
							installTaskCount,
						};
					}),
				),
				projectName: model?.project?.title || "",
				builderId: model?.project?.builder?.id || null,
				builderName: model?.project?.builder?.name || "",
				modelName: model?.modelName,
			};
		}),
	getModelInstallTasksByBuilderTask: publicProcedure
		.input(z.object({ builderTaskId: z.number(), modelId: z.number() }))
		.query(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const { db } = props.ctx;
			const { modelId: communityModelId, builderTaskId } = props.input;
			// const tasks = await db.communityModelInstallTask.findMany({
			//   where: {
			//     builderTaskId,
			//     communityModelId,
			//   },
			//   select: {
			//     // builderTask: true,
			//     id: true,
			//     builderTaskId: true,
			//     installCostModelId: true,
			//     qty: true,
			//     status: true,
			//   },
			// });

			const installCosts = await db.installCostModel.findMany({
				where: {
					status: "active",
				},
				select: {
					id: true,
					title: true,
					unit: true,
					unitCost: true,
				},
			});
			const builderTaskInstallCosts = await db.builderTaskInstallCost.findMany({
				where: {
					builderTaskId,
				},
				select: {
					id: true,
					orderIndex: true,
					createdAt: true,
					installCostModel: {
						select: {
							id: true,
							title: true,
							unit: true,
							unitCost: true,
							status: true,
						},
					},
					modelInstallTasks: {
						where: {
							communityModelId,
						},
						take: 1,
					},
				},
			});
			const sortedCosts = sortInstallCosts(
				builderTaskInstallCosts.map((cost) => ({
					...cost,
					builderTaskInstallCost: {
						id: cost.id,
						orderIndex: cost.orderIndex ?? null,
						createdAt: cost.createdAt ?? null,
					},
				})),
			);
			return {
				tasks: sortedCosts.map((b) => {
					const modelInstallTask = b.modelInstallTasks[0];
					return {
						id: modelInstallTask?.id || null,
						builderTaskId,
						installCostModelId: b.installCostModel.id,
						qty: modelInstallTask?.qty || null,
						status: modelInstallTask?.status || "inactive",
						installCostModel: b.installCostModel,
						builderTaskInstallCostId: b.id,
					};
				}),
				installCosts,
			};
		}),
	saveModelInstallTask: publicProcedure
		.input(
			z.object({
				id: z.number().optional().nullable(),
				modelId: z.number(),
				qty: z.number().optional().nullable(),
				installCostModelId: z.number(),
				builderTaskId: z.number(),
				status: z
					.enum(["active", "inactive"])
					.optional()
					// .nullable()
					.default("inactive"),
			}),
		)
		.mutation(async (props) => {
			await assertInstallCostAccess(props.ctx);
			const { db } = props.ctx;
			const { id, modelId, qty, installCostModelId, builderTaskId, status } =
				props.input;
			if (id) {
				await db.communityModelInstallTask.update({
					where: { id },
					data: {
						communityModelId: modelId,
						qty,
						installCostModelId,
						builderTaskId,
						status,
					},
				});
			} else {
				await db.communityModelInstallTask.create({
					data: {
						communityModelId: modelId,
						installCostModelId,
						builderTaskId,
						qty,
						status,
					},
				});
			}
		}),
	upgradeBuilderToV2: publicProcedure
		.input(z.object({ builderId: z.number() }))
		.mutation(async (props) => {
			const { db } = props.ctx;
			const { builderId } = props.input;
			// check if already exists
			const existing = await db.builders.findFirst({
				where: {
					id: builderId,
				},
			});
			if (!existing) return null;
			const meta: CommunityBuilderMeta = (existing.meta as any) || {};
			// const {
			//   address: meta?.address,
			// }
			meta.upgraded = true;
			await db.builders.update({
				where: { id: builderId },
				data: {
					meta,
					address: meta?.address,
					// status: "active",
					tasks: {
						createMany: {
							data: (meta?.tasks || []).map(
								({
									name: taskName,
									uid: taskUid,
									billable,
									produceable: productionable,
									addon,
									installable,
								}) => ({
									taskName,
									taskUid,
									billable,
									productionable,
									addonPercentage: 0,
									installable,
								}),
							),
						},
					},
				},
			});
			return true;
		}),
});
