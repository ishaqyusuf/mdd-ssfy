import { createTRPCRouter, publicProcedure } from "../init";
import {
  auth,
  getLoginByToken,
  login,
  loginSchema,
} from "@api/db/queries/user";
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
  login: publicProcedure.input(loginSchema).mutation(async (props) => {
    return login(props.ctx, props.input);
  }),
});
