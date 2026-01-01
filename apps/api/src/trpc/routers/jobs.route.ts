import {
  createJob,
  createJobSchema,
  earningAnalytics,
  earningAnalyticsSchema,
  getInstallCosts,
  getInstallCostsSchema,
  getJobAnalytics,
  getJobAnalyticsSchema,
  getJobs,
  getJobsSchema,
} from "@api/db/queries/jobs";
import { createTRPCRouter, publicProcedure } from "../init";

export const jobRoutes = createTRPCRouter({
  getJobs: publicProcedure.input(getJobsSchema).query(async (props) => {
    return getJobs(props.ctx, props.input);
  }),
  getInstallCosts: publicProcedure
    .input(getInstallCostsSchema)
    .query(async (props) => {
      return getInstallCosts(props.ctx, props.input);
    }),
  getJobAnalytics: publicProcedure
    .input(getJobAnalyticsSchema)
    .query(async (props) => {
      return getJobAnalytics(props.ctx, props.input);
    }),
  earningAnalytics: publicProcedure
    .input(earningAnalyticsSchema)
    .query(async (props) => {
      return earningAnalytics(props.ctx, props.input);
    }),
  createJob: publicProcedure.input(createJobSchema).mutation(async (props) => {
    return createJob(props.ctx, props.input);
  }),
});
