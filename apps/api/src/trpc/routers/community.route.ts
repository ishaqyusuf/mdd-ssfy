import { createTRPCRouter, publicProcedure } from "../init";
import {
  buildersList,
  createCommnunityModelCost,
  getCommunityTemplateForm,
  projectList,
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
