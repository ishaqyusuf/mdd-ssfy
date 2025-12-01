import {
  getInstallCosts,
  getInstallCostsSchema,
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
});
