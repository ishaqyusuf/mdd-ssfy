import { createTRPCRouter, publicProcedure } from "../init";
import {
  auth,
  getLoginByToken,
  login,
  loginSchema,
} from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";
import { consoleLog } from "@gnd/utils";
import { sign } from "jsonwebtoken";
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
    const data = await login(props.ctx, props.input);
    if (!data) throw Error("Invalid credential");
    const token = sign(
      {
        sessionId: data?.sessionId,
        userId: data?.user?.id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "30d",
      }
    );

    return {
      ...data,
      token,
    };
  }),
});
