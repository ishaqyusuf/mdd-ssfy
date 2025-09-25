import { createTRPCRouter, publicProcedure } from "../init";
import { auth, getLoginByToken } from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";

export const userRoutes = createTRPCRouter({
  // validateAuth: publicProcedure.input()
  getLoginByToken: publicProcedure
    .input(loginByTokenSchema)
    .query(async (props) => {
      return getLoginByToken(props.ctx, props.input);
    }),
  auth: publicProcedure.query(async (props) => {
    return auth(props.ctx);
  }),
});
