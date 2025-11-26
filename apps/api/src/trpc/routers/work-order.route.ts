import {
  createTRPCRouter,
  publicProcedure,
} from "@api/trpc/init";
import {
  workOrderAnalytic,
  workOrderAnalyticSchema,
} from "@api/db/queries/work-order";

export const workOrderRouter = createTRPCRouter({
  getWorkOrderAnalytic: publicProcedure
    .input(workOrderAnalyticSchema)
    .query(async (props) => {
      return workOrderAnalytic(props.ctx, props.input);
    }),
});
