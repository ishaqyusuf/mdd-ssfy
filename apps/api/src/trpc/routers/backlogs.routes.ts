// import { getBacklogs } from "../../db/queries/backlogs";
import { getBacklogs, getBacklogsSchema } from "@api/db/queries/backlogs";
import { createTRPCRouter, publicProcedure } from "../init";

export const backlogRouters = createTRPCRouter({
  getBacklogs: publicProcedure.input(getBacklogsSchema).query(async (props) => {
    return getBacklogs(props.ctx, props.input);
  }),
  all: publicProcedure
    //   .input(getAllSubjectsSchema)
    //
    .query(async (q) => {
      // return await getBacklogs(q.ctx.db, q.input);
    }),
  getByClassroom: publicProcedure
    // .input(getClassroomSubjectsSchema)
    .query(async ({ input, ctx: { db } }) => {
      return {
        message: "Hello World",
      };
      //   return await getClassroomSubjects(db, input);
    }),
});
