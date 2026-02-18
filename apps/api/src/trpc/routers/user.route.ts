import { createTRPCRouter, publicProcedure } from "../init";
import {
  auth,
  getLoginByToken,
  login,
  loginSchema,
} from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";
import { consoleLog } from "@gnd/utils";
import { getContact } from "@notifications/activities";
import { sign } from "jsonwebtoken";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
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
  notificationAccount: publicProcedure.query(async (props) => {
    const user = await auth(props.ctx);
    const recipient = (await getSubscriberAccount(
      props.ctx.db,
      user.id,
      // {
      //   email: user?.email || "",
      //   name: user?.name || "",
      //   phoneNo: user?.phoneNo || "",
      //   id: user.id,
      // },
      "employee",
    ))!;
    return {
      id: recipient.id,
      email: recipient.email,
      name: recipient.name,
      phoneNo: recipient.phoneNo,
    };
  }),
  loginExample: publicProcedure.input(loginSchema).mutation(async (props) => {
    return {};
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
      },
    );

    return {
      ...data,
      token,
    };
  }),
});
