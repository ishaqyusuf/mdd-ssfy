// import { getBacklogs } from "../../db/queries/backlogs";
import { getBacklogs } from "@api/db/queries/backlogs";
import { createTRPCRouter, publicProcedure } from "../init";

export const backlogRouters = createTRPCRouter({
  all: publicProcedure
    //   .input(getAllSubjectsSchema)
    //
    .query(async (q) => {
      // console.log(q.ctx.)
      return await getBacklogs(q.ctx.db, q.input);
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
