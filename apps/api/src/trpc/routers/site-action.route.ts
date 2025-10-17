// import { getBacklogs } from "../../db/queries/backlogs";
import { getBacklogs } from "@api/db/queries/backlogs";
import { createTRPCRouter, publicProcedure } from "../init";
import { inboundQuerySchema, salesQueryParamsSchema } from "@api/schemas/sales";
import { getSales } from "@api/db/queries/sales";
import { getInbounds, getInboundSummary } from "@api/db/queries/inbound";
import { siteActionsFilterSchema } from "@api/schemas/site-actions";
import { getSiteActions } from "@api/db/queries/site-action";

export const siteActionsRoutes = createTRPCRouter({
  index: publicProcedure.input(siteActionsFilterSchema).query(async (props) => {
    return getSiteActions(props.ctx, props.input);
  }),
});
