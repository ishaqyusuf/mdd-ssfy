import { createTRPCRouter, publicProcedure } from "../init";

export const backlogRouters = createTRPCRouter({
  all: publicProcedure
    //   .input(getAllSubjectsSchema)
    //
    .query(async (q) => {
      // console.log(q.ctx.)
      // return await getAllSubjects(q.ctx, q.input);
    }),
  getByClassroom: publicProcedure
    // .input(getClassroomSubjectsSchema)
    .query(async ({ input, ctx: { db } }) => {
      //   return await getClassroomSubjects(db, input);
    }),
});
