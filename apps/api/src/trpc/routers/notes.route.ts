import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { getNotificationChannels, saveInboundNote } from "@api/db/queries/note";
import { saveNote, saveNoteSchema } from "@gnd/utils/note";
import z from "zod";
import { getNotificationChannelsSchema } from "@notifications/schemas";
import { consoleLog } from "@gnd/utils";

export const notesRouter = createTRPCRouter({
  getNotificationChannels: publicProcedure
    .input(getNotificationChannelsSchema)
    .query(async (props) => {
      return getNotificationChannels(props.ctx, props.input);
    }),
  getNotificationChannel: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async (props) => {
      const { data } = await getNotificationChannels(props.ctx, {
        id: props.input.id,
      });
      return data[0];
    }),
  updateNotificationChannel: publicProcedure
    .input(
      z.object({
        id: z.number(),
        // subscriberIds: z.array(z.number()),
        // roleIds: z.array(z.number()),
        inAppSupport: z.boolean().optional().nullable(),
        textSupport: z.boolean().optional().nullable(),
        emailSupport: z.boolean().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { id, ...updates } = props.input;
      await props.ctx.db.noteChannels.update({
        where: {
          id,
        },
        data: {
          ...updates,
        },
      });
    }),
  removeNotificationChannelRole: publicProcedure
    .input(
      z.object({
        notificationChannelId: z.number(),
        roleId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { notificationChannelId, roleId } = props.input;
      await props.ctx.db.noteChannelRole.updateMany({
        where: {
          noteChannelId: notificationChannelId,
          roleId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }),
  addNotificationChannelRole: publicProcedure
    .input(
      z.object({
        notificationChannelId: z.number(),
        roleId: z.number(),
        id: z.number().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { notificationChannelId, roleId } = props.input;
      if (props.input.id)
        await props.ctx.db.noteChannelRole.updateMany({
          where: {
            deletedAt: {},
            id: props.input.id,
          },
          data: {
            deletedAt: null,
          },
        });
      else
        await props.ctx.db.noteChannelRole.create({
          data: {
            noteChannelId: notificationChannelId,
            roleId,
          },
        });
    }),
  removeNotificationChannelSubscriber: publicProcedure
    .input(
      z.object({
        notificationChannelId: z.number(),
        subscriberId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { notificationChannelId, subscriberId } = props.input;
    }),
  addNotificationChannelSubscriber: publicProcedure
    .input(
      z.object({
        notificationChannelId: z.number(),
        subscriberId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { notificationChannelId, subscriberId } = props.input;
    }),
  saveInboundNote: publicProcedure
    .input(saveInboundNoteSchema)
    .mutation(async (props) => {
      return saveInboundNote(props.ctx, props.input);
    }),
  saveNote: publicProcedure.input(saveNoteSchema).mutation(async (props) => {
    return saveNote(props.ctx.db, props.input, props.ctx.userId);
  }),
  list: publicProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()),
        maxPriority: z.number().optional(),
        pageSize: z.number().optional(),
        status: z.array(z.enum(["unread", "read", "archived"])).optional(),
      }),
    )
    .query(async (props) => {
      const {
        maxPriority,
        pageSize = 20,
        status = ["unread", "read"],
      } = props.input;

      return {
        data: [],
      };
    }),
});
