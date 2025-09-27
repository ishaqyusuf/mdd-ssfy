import { createTRPCRouter, publicProcedure } from "../init";
import {
  buildersList,
  communityModelCostForm,
  communityModelCostFormSchema,
  communityModelCostHistory,
  communityModelCostHistorySchema,
  communitySummary,
  communitySummarySchema,
  createCommnunityModelCost,
  deleteCommunityModelCost,
  deleteCommunityModelCostSchema,
  getCommunityProjects,
  getCommunityProjectsSchema,
  getCommunityTemplateForm,
  projectList,
  saveCommunityModelCost,
  saveCommunityModelCostSchema,
  saveCommunityTemplateForm,
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
  getCommunitySchema,
  getCommunitySchemaSchema,
} from "@community/community-template-schemas";
export const communityRouters = createTRPCRouter({
  buildersList: publicProcedure.query(async (q) => {
    return buildersList(q.ctx);
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
  deleteCommunityModelCost: publicProcedure
    .input(deleteCommunityModelCostSchema)
    .mutation(async (props) => {
      return deleteCommunityModelCost(props.ctx, props.input);
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
      })
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
  projectsList: publicProcedure.query(async (q) => {
    return projectList(q.ctx);
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
        })
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

  // getProjectForm: publicProcedure.query(async (props) => {
  //   return;
  // }),
});
