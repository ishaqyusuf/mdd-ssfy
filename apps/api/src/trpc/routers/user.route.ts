import { createTRPCRouter, publicProcedure } from "../init";
import {
  auth,
  changePassword,
  deleteUserDocument,
  getLoginByToken,
  getProfile,
  login,
  loginSchema,
  saveUserDocument,
  updateNotificationPreferences,
  updateProfile,
} from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";
import { consoleLog } from "@gnd/utils";
import { getContact } from "@notifications/activities";
import { sign } from "jsonwebtoken";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
import { z } from "zod";

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
  getProfile: publicProcedure.query(async (props) => {
    return getProfile(props.ctx);
  }),
  updateProfile: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        username: z.string().optional().nullable(),
        phoneNo: z.string().optional().nullable(),
        avatarUrl: z.string().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      return updateProfile(props.ctx, props.input);
    }),
  changePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async (props) => {
      return changePassword(props.ctx, props.input);
    }),
  saveDocument: publicProcedure
    .input(
      z.object({
        id: z.number().optional().nullable(),
        title: z.string().min(1),
        url: z.string().min(1),
        description: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      return saveUserDocument(props.ctx, props.input);
    }),
  deleteDocument: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async (props) => {
      return deleteUserDocument(props.ctx, props.input.id);
    }),
  updateNotificationPreferences: publicProcedure
    .input(
      z.object({
        emailNotifications: z.boolean(),
        smsNotifications: z.boolean(),
        orderUpdates: z.boolean(),
        dispatchAlerts: z.boolean(),
        paymentAlerts: z.boolean(),
        systemAnnouncements: z.boolean(),
      }),
    )
    .mutation(async (props) => {
      return updateNotificationPreferences(props.ctx, props.input);
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
