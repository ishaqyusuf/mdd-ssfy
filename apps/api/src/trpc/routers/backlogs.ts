import { createTRPCRouter, publicProcedure } from "../init";

export const backlogRouters = createTRPCRouter({
  all: publicProcedure
    //   .input(getAllSubjectsSchema)
    //
    .query(async (q) => {
      return {
        message: "Hello World",
      };
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
