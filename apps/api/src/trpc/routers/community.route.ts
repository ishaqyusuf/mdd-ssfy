import { createTRPCRouter, publicProcedure } from "../init";
import {
  buildersList,
  communityModelCostForm,
  communityModelCostFormSchema,
  communityModelCostHistory,
  communityModelCostHistorySchema,
  createCommnunityModelCost,
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

export const communityRouters = createTRPCRouter({
  projectsList: publicProcedure.query(async (q) => {
    return projectList(q.ctx);
  }),
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
  saveCommunityModelCostForm: publicProcedure
    .input(saveCommunityModelCostSchema)
    .mutation(async (props) => {
      const result = await saveCommunityModelCost(props.ctx, props.input);
      return result;
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
  saveCommunityTemplateData: publicProcedure
    .input(communityTemplateFormSchema)
    .mutation(async (props) => {
      return saveCommunityTemplateForm(props.ctx, props.input);
    }),
  createCommunityModelCost: publicProcedure
    .input(createCommunityModelCostSchema)
    .mutation(async (props) => {
      return createCommnunityModelCost(props.ctx, props.input);
    }),
  // getProjectForm: publicProcedure.query(async (props) => {
  //   return;
  // }),
});
