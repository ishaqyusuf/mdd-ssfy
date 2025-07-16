import { createTRPCRouter, publicProcedure } from "../init";
import { getLoginByToken } from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";

export const userRoutes = createTRPCRouter({
  getLoginByToken: publicProcedure
    .input(loginByTokenSchema)
    .query(async (props) => {
      return getLoginByToken(props.ctx, props.input);
    }),
});
