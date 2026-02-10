import { createTRPCRouter, publicProcedure } from "../init";
import {
  buildersList,
  communityInstallCostForm,
  communityInstallCostFormSchema,
  communityModelCostForm,
  communityModelCostFormSchema,
  communityModelCostHistory,
  communityModelCostHistorySchema,
  communitySummary,
  communitySummarySchema,
  createCommnunityModelCost,
  deleteCommunityModelCost,
  deleteCommunityModelCostSchema,
  deleteUnits,
  deleteUnitsSchema,
  getCommunityProjects,
  getCommunityProjectsSchema,
  getCommunityTemplateForm,
  getProjectForm,
  getProjectFormSchema,
  getUnitJobs,
  getUnitJobsSchema,
  projectList,
  saveCommunityModelCost,
  saveCommunityModelCostSchema,
  saveCommunityTemplateForm,
  updateInstallCost,
  updateInstallCostSchema,
} from "@api/db/queries/community";
import { z } from "zod";
import {
  communityTemplateFormSchema,
  createCommunityModelCostSchema,
} from "@api/schemas/community";
import {
  getWorkOrderForm,
  saveWorkOrderForm,
  workOrderFormSchema,
} from "@api/db/queries/work-order";
import {
  getCommunityTemplates,
  getCommunityTemplatesSchema,
} from "@api/db/queries/community-template";
import {
  createCommunityTemplateBlock,
  createCommunityTemplateBlockSchema,
  saveTemplateInputListing,
  saveTemplateInputListingSchema,
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
  updateCommunityBlockInput,
  updateCommunityBlockInputSchema,
  updateRecordsIndices,
  updateRecordsIndicesSchema,
  deleteInputInventoryBlock,
  deleteInputInventoryBlockSchema,
  updateCommunityBlockInputAnalyticsSchema,
  updateCommunityBlockInputAnalytics,
} from "@community/community-template-schemas";
import { getBuilders, getBuildersSchema } from "@community/builder";
import {
  saveCommunityModel,
  saveCommunityModelLegacy,
  saveCommunityModelLegacySchema,
  saveCommunityModelSchema,
} from "@community/community-model";
import {
  getProjectUnits,
  getProjectUnitsSchema,
} from "@api/db/queries/project-units";
import { consoleLog, generateRandomString } from "@gnd/utils";
import type { CommunityBuilderMeta } from "@gnd/utils/community";
import {
  builderFormSchema,
  communityInstallCostRateSchema,
} from "@community/schema";
import { getSettingAction } from "@gnd/settings";
import { INSTALL_COST_DEFAULT_UNITS } from "@community/constants";
import type { ProjectMeta } from "@community/types";
export const communityRouters = createTRPCRouter({
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
      const result = await communityInstallCostForm(props.ctx, props.input);
      return result;
    }),
  updateInstallCost: publicProcedure
    .input(updateInstallCostSchema)
    .mutation(async (props) => {
      return updateInstallCost(props.ctx, props.input);
    }),
  communitySummary: publicProcedure
    .input(communitySummarySchema)
    .query(async (props) => {
      const result = await communitySummary(props.ctx.db, props.input);
      return result;
    }),
  createCommunityModelCost: publicProcedure
    .input(createCommunityModelCostSchema)
    .mutation(async (props) => {
      return createCommnunityModelCost(props.ctx, props.input);
    }),
  getBuilders: publicProcedure.input(getBuildersSchema).query(async (q) => {
    return getBuilders(q.ctx.db, q.input);
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
    const legacyCosts = await (async () => {
      const ss = await getSettingAction("install-price-chart", props.ctx.db);
      const s = ss?.meta?.list || [];
      return s;
    })();

    return {
      communityInstallCostRates: r,
      legacyCosts,
    };
  }),
  getJobForm: publicProcedure
    .input(
      z.object({
        jobId: z.number().optional().nullable(),
        taskId: z.number().optional().nullable(),
        unitId: z.number(),
      }),
    )
    .query(async (props) => {
      const { jobId, taskId } = props.input;
      // get unit information
      const { db } = props.ctx;
      const unit = await props.ctx.db.homes.findFirst({
        where: {
          id: props.input.unitId,
        },
        select: {
          lot: true,
          block: true,
          modelName: true,
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
      });
      const projectAddon = (unit?.project?.meta as any as ProjectMeta)?.addon;
      const tasks = await db.builderTask.findFirst({
        where: {
          id: taskId!,
        },
        select: {
          taskName: true,
          addonPercentage: true,
          builderTaskInstallCosts: {
            select: {
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
      });
      return {
        unit: {
          lot: unit?.lot,
          block: unit?.block,
          modelName: unit?.modelName,
          projectTitle: unit?.project.title,
          builderName: unit?.project?.builder?.name,
          projectAddon,
        },
      };
    }),

  getInstallCostRatesSuggestions: publicProcedure
    .input(
      z.object({
        builderTaskId: z.number(),
        modelId: z.number(),
      }),
    )
    .query(async (props) => {
      const suggestions = await props.ctx.db.installCostModel.findMany({
        where: {
          status: "active",
          communityModelInstallTasks: {
            every: {
              builderTaskId: {
                not: props.input.builderTaskId,
              },
              communityModelId: {
                not: props.input.modelId,
              },
            },
          },
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
      return suggestions;
      // Implementation for getInstallCostRatesSuggestions
    }),
  getInstallCostRateUnits: publicProcedure.query(async (props) => {
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
      if (!props.input.builderTaskInstallCostId) {
        const r = await props.ctx.db.builderTaskInstallCost.create({
          data: {
            builderTaskId: props.input.builderTaskId,
            installCostModelId: props.input.installCostModelId,
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
  updateInstallCostRate: publicProcedure
    .input(communityInstallCostRateSchema)
    .mutation(async (props) => {
      const { id, title, unit, unitCost } = props.input;
      if (id) {
        await props.ctx.db.installCostModel.update({
          where: { id },
          data: {
            title,
            unit,
            unitCost,
          },
        });
      } else {
        await props.ctx.db.installCostModel.create({
          data: {
            title,
            unit,
            unitCost,
            status: "active",
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
          lot: "asc",
          // block: "asc",
        },
        select: {
          id: true,
          lot: true,
          block: true,
          modelName: true,
          modelNo: true,
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
              id: true,
              amount: true,
              status: true,
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
        };
      });
    }),
  getBuilderTasksForProject: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        homeId: z.number(),
      }),
    )
    .query(async (props) => {
      const { projectId, homeId } = props.input;
      const { db } = props.ctx;
      const tasks = await db.builderTask.findMany({
        where: {
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
          communityModelInstallTasks: {
            select: {
              id: true,
              qty: true,
              installCostModel: {
                select: {
                  title: true,
                  unitCost: true,
                  unit: true,
                },
              },
            },
            where: {
              communityModel: {
                homes: {
                  some: {
                    id: homeId,
                  },
                },
              },
            },
          },
        },
      });
      return tasks.map((task) => ({
        id: task.id,
        taskName: task.taskName,
        installTasksCount: task.communityModelInstallTasks.length,
        // installCostModel: task.communityModelInstallTasks?.[0]?.installCostModel || null,
        // qty: task.communityModelInstallTasks?.[0]?.qty || null,
        estimatedCost: task.communityModelInstallTasks.reduce((acc, t) => {
          const cost = (t.installCostModel?.unitCost || 0) * (t.qty || 0);
          return acc + cost;
        }, 0),
      }));
    }),
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
                  name: true,

                  tasks: {
                    select: {
                      id: true,
                      taskName: true,
                      billable: true,
                      productionable: true,
                      addonPercentage: true,
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
              id: true,
            },
          },
        },
      });
      return {
        builderTasks: (model?.project?.builder?.tasks || [])?.map((task) => {
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
        projectName: model?.project?.title || "",
        builderName: model?.project?.builder?.name || "",
        modelName: model?.modelName,
      };
    }),
  getModelInstallTasksByBuilderTask: publicProcedure
    .input(z.object({ builderTaskId: z.number(), modelId: z.number() }))
    .query(async (props) => {
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
      return {
        tasks: builderTaskInstallCosts.map((b) => {
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
