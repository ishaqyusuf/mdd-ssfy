import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { getNotificationChannels, saveInboundNote } from "@api/db/queries/note";
import { saveNote, saveNoteSchema } from "@gnd/utils/note";
import z from "zod";
import { getNotificationChannelsSchema } from "@notifications/schemas";
import { createActivity, getActivties } from "@notifications/activities";
import {
  getActivityTree,
  getActivityTagSuggestions,
} from "@notifications/activity-tree";
import { getSubscribersAccount } from "@notifications/channel-subscribers";
import { channelNames } from "@notifications/channels";

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
        whatsappSupport: z.boolean().optional().nullable(),
        emailSupport: z.boolean().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { id, whatsappSupport, textSupport, ...updates } = props.input;
      const normalizedWhatsApp = whatsappSupport ?? textSupport;
      await props.ctx.db.noteChannels.update({
        where: {
          id,
        },
        data: {
          ...updates,
          ...(normalizedWhatsApp === undefined
            ? {}
            : {
                whatsappSupport: normalizedWhatsApp,
                textSupport: normalizedWhatsApp,
              }),
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
      await props.ctx.db.noteChannelRole.deleteMany({
        where: {
          noteChannelId: notificationChannelId,
          roleId,
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
      // if (props.input.id)
      //   await props.ctx.db.noteChannelRole.updateMany({
      //     where: {
      //       deletedAt: {},
      //       id: props.input.id,
      //     },
      //     data: {
      //       deletedAt: null,
      //     },
      //   });
      // else
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
  createInboxActivity: protectedProcedure
    .input(
      z.object({
        channel: z.enum(channelNames),
        payload: z.record(z.string(), z.any()).optional(),
        subject: z.string().optional(),
        headline: z.string().optional(),
        message: z.string().optional(),
        noteColor: z.string().optional(),
        contacts: z
          .array(
            z.object({
              role: z.enum(["employee", "customer"]).default("employee"),
              ids: z.array(z.number()).min(1),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const author = (
        await getSubscribersAccount(ctx.db, [ctx.userId], {
          role: "employee",
          channelName: input.channel,
        })
      )?.[0];

      if (!author?.id) {
        throw new Error("Unable to resolve notification author contact");
      }

      const recipientContactIds = Array.from(
        new Set(
          (
            await Promise.all(
              (input.contacts || []).map(async (group) => {
                const recipients = await getSubscribersAccount(
                  ctx.db,
                  group.ids,
                  {
                    role: group.role,
                    channelName: input.channel,
                  },
                );
                return recipients.map((recipient) => recipient.id);
              }),
            )
          ).flat(),
        ),
      );

      const message = input.message?.trim();
      const subject =
        input.subject ||
        `Inbox ${input.channel.replaceAll("_", " ").toUpperCase()}`;
      const headline =
        input.headline || message || `Sent to ${input.channel} channel`;

      const tags = {
        ...(input.payload || {}),
        noteColor: input.noteColor || undefined,
        noContact: recipientContactIds.length === 0,
      } as Record<string, unknown>;

      const activity = await createActivity(
        ctx.db,
        {
          type: input.channel,
          source: "user",
          subject,
          headline,
          note: message
            ? message
            : Object.keys(input.payload || {}).length > 0
              ? JSON.stringify(input.payload || {}, null, 2)
              : undefined,
          tags,
        },
        author.id,
        recipientContactIds.length ? recipientContactIds : undefined,
      );

      return {
        id: activity.id,
        recipientCount: recipientContactIds.length,
        noContact: recipientContactIds.length === 0,
      };
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
      return getActivties(props.ctx.db, {
        contactIds: props.input.contactIds,
        status: props.input.status as any,
      });
      // const {
      //   maxPriority,
      //   pageSize = 20,
      //   status = ["unread", "read"],
      // } = props.input;

      // return {
      //   data: [],
      // };
    }),
  activityTree: publicProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()).optional(),
        status: z.array(z.enum(["unread", "read", "archived"])).optional(),
        tagFilters: z
          .array(
            z.object({
              tagName: z.string().min(1),
              tagValue: z.any(),
            }),
          )
          .optional(),
        tagFilterMode: z.enum(["all", "any"]).optional(),
        pageSize: z.number().int().min(1).max(200).optional(),
        includeChildren: z.boolean().optional(),
        maxDepth: z.number().int().min(1).max(10).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getActivityTree(ctx.db, input as any);
    }),
  activityTagSuggestions: publicProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()).optional(),
        status: z.array(z.enum(["unread", "read", "archived"])).optional(),
        tagFilters: z
          .array(
            z.object({
              tagName: z.string().min(1),
              tagValue: z.any(),
            }),
          )
          .optional(),
        tagFilterMode: z.enum(["all", "any"]).optional(),
        channels: z.array(z.string()).optional(),
        tagName: z.string().optional(),
        q: z.string().optional(),
        limitPerTag: z.number().int().min(1).max(100).optional(),
        maxRows: z.number().int().min(1).max(10000).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getActivityTagSuggestions(ctx.db, input as any);
    }),
});
