// import { getBacklogs } from "../../db/queries/backlogs";
import { getBacklogs } from "@api/db/queries/backlogs";
import { createTRPCRouter, publicProcedure } from "../init";
import { inboundQuerySchema, salesQueryParamsSchema } from "@api/schemas/sales";
import { getSales } from "@api/db/queries/sales";
import {
  getInboundFilters,
  getInbounds,
  getInboundSummary,
} from "@api/db/queries/inbound";

export const salesRouter = createTRPCRouter({
  index: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getSales(props.ctx, props.input);
  }),
  getByClassroom: publicProcedure
    // .input(getClassroomSubjectsSchema)
    .query(async ({ input, ctx: { db } }) => {
      return {
        message: "Hello World",
      };
    }),
  inboundIndex: publicProcedure
    .input(inboundQuerySchema)
    .query(async (props) => {
      return getInbounds(props.ctx, props.input);
    }),
  inboundSummary: publicProcedure
    .input(inboundQuerySchema)
    .query(async (props) => {
      return getInboundSummary(props.ctx, props.input);
    }),
  inboundFilterData: publicProcedure.query(async (props) => {
    return getInboundFilters(props.ctx);
  }),
});
