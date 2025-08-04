import { createTRPCRouter, publicProcedure } from "../init";
import {
  getCommunityTemplateForm,
  projectList,
  saveCommunityTemplateForm,
} from "@api/db/queries/community";
import { z } from "zod";
import { communityTemplateFormSchema } from "@api/schemas/community";

export const communityRouters = createTRPCRouter({
  projectsList: publicProcedure.query(async (q) => {
    return projectList(q.ctx);
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

  // getProjectForm: publicProcedure.query(async (props) => {
  //   return;
  // }),
});
