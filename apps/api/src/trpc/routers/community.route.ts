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
import { generateRandomString } from "@gnd/utils";
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

  saveBuilderTask: publicProcedure
    .input(
      z.object({
        id: z.number().optional().nullable(),
        builderId: z.number(),
        taskName: z.string(),
        billable: z.boolean().optional().nullable(),
        productionable: z.boolean().optional().nullable(),
        addonPercentage: z.number().optional().nullable(),
        installable: z.boolean().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { db } = props.ctx;
      const {
        builderId,
        taskName,
        billable,
        productionable,
        addonPercentage,
        id,
        installable,
      } = props.input;
      if (id) {
        await db.builderTask.update({
          where: { id },
          data: {
            builderId,
            taskName,
            billable,
            productionable,
            addonPercentage,
            installable,
          },
        });
      } else {
        await db.builderTask.create({
          data: {
            builderId,
            taskName,
            billable,
            productionable,
            addonPercentage,
            installable,
            taskUid: generateRandomString(5),
          },
        });
      }
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
  getModelInstallTasksByBuilderTask: publicProcedure
    .input(z.object({ builderTaskId: z.number(), modelId: z.number() }))
    .query(async (props) => {
      const { db } = props.ctx;
      const { modelId: communityModelId, builderTaskId } = props.input;
      const tasks = await db.communityModelInstallTask.findMany({
        where: {
          builderTaskId,
          communityModelId,
        },
        include: {
          builderTask: true,
        },
      });
      return tasks;
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
});
