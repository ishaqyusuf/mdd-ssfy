import { z } from "zod";
import { ChannelName, channelNames } from "./channels";
import { paginationSchema } from "@gnd/utils/schema";

const channel = z.enum(channelNames);
const source = z.enum(["system", "user"]).default("system");
const priority = z.number().int().min(1).max(10).default(5);
const baseActivityTags = z.object({
  type: channel,
  source,
  priority,
  sendEmail: z.boolean().optional().default(false),
});
const activitiesTags = z.object({
  id: z.number(),
  slug: z.string(),
});
export const jobAssignedTags = activitiesTags
  .pick({
    id: true,
  })
  .extend(baseActivityTags.shape);
export const createActivitySchema = z.object({
  // teamId: z.string().uuid(),
  subject: z.string(),
  headline: z.string().optional(),
  note: z.string().optional(),
  authorId: z.number().optional(),
  // sendEmail: z.boolean().optional().default(false),
  // userIds: z.array(z.number()).optional().nullable(), ///number().optional(),
  // recipientId: z.number().optional(),
  // userIdType: z.enum(["user", "customer"]).optional().default("user"),
  type: channel,
  source,
  // priority,
  // status: z.enum([]),
  // groupId: z.string().uuid().optional(), // Links related activities together
  tags: z.record(z.string(), z.any()), // Flexible - any JSON object
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email().optional().nullable,
  phoneNo: z.string().optional(),
  // locale: z.string().optional(),
  // avatar_url: z.string().optional(),
  // team_id: z.string().uuid(),
  // role: z.enum(["owner", "member"]).optional(),
});

// export const transactionSchema = z.object({
//   id: z.string(),
//   name: z.string(),
//   amount: z.number(),
//   currency: z.string(),
//   date: z.string(),
//   category: z.string().optional(),
//   status: z.string().optional(),
// });

// export const invoiceSchema = z.object({
//   id: z.string(),
//   number: z.string(),
//   amount: z.number(),
//   currency: z.string(),
//   due_date: z.string(),
//   status: z.string(),
// });

export const salesCheckoutSuccessSchema = z.object({
  orderId: z.string(),
  users: z.array(userSchema),

  // totalCount: z.number(),
  // inboxType: z.enum(["email", "sync", "slack", "upload"]),
  // source: z.enum(["user", "system"]).default("system"),
  // provider: z.string().optional(),
});

export type SalesCheckoutSuccessInput = z.infer<
  typeof salesCheckoutSuccessSchema
>;

export const jobActivitySchema = z.object({
  users: z.array(userSchema).optional().nullable(),
  jobId: z.number(),
  activityType: z.enum([
    "job_created",
    "job_assigned",
    "job_submitted",
    "job_approved",
    "job_rejected",
    "job_review_requested",
    "job_deleted",
    // "job_updated",
    "job_reassigned",
    "job_status_updated",
    "note_added",
  ]),
  author: z.string().optional().nullable(),
  comment: z.string().optional(),
});
export type JobActivityInput = z.infer<typeof jobActivitySchema>;

export const jobAssignedSchema = z.object({
  // contacts: z.array(userSchema).optional().nullable(),
  jobId: z.number(),
  // authorId: z.number(),
  assignedToId: z.number(),
  assignedToName: z.string().optional(),
  // comment: z.string().optional(),
  // author: z.string().optional().nullable(),
});
export type JobAssignedInput = z.infer<typeof jobAssignedSchema>;
// Notification types map - all available notification types with their data structures

export type NotificationTypes = {
  // sales_checkout_success: SalesCheckoutSuccessInput;
  // job_activity: JobActivityInput;
  job_assigned: JobAssignedInput;
  sales_dispatch_assigned: SalesDispatchAssignedInput;
};

export const getNotificationChannelsSchema = z
  .object({
    id: z.number().optional().nullable(),
    name: z.string().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetNotificationChannelsSchema = z.infer<
  typeof getNotificationChannelsSchema
>;
export const salesDispatchAssignedSchema = z.object({
  // salesId: z.number(),
  orderNo: z.string().optional(),
  dispatchId: z.number(),
  deliveryMode: z.enum(["pickup", "delivery"]).optional(),
  dueDate: z.date().optional(),
  driverId: z.number().optional(),
  // status: z.enum(["queue", "assigned", "en_route", "delivered"]).optional(),
});
export type SalesDispatchAssignedInput = z.infer<
  typeof salesDispatchAssignedSchema
>;
export const baseNotificationJobSchema = z.object({
  author: z.object({
    id: z.number(),
    role: z.enum(["customer", "employee"]).default("employee"),
  }),
  recipients: z
    .array(
      z.object({
        ids: z.array(z.number()),
        role: z.enum(["customer", "employee"]).optional().default("employee"),
      }),
    )
    .optional()
    .nullable(),
  // channel: z.enum(channelNames).default('job_approved'),
  // channel: z.enum(["a"] as const),
  payload: z.record(z.string(), z.any()),
});

const _channel = (channel: ChannelName) => channel as string;
//z.literal(channel);
export const notificationJobSchema = z.discriminatedUnion("channel", [
  baseNotificationJobSchema.extend({
    channel: z.literal("sales_dispatch_assigned"),
    payload: salesDispatchAssignedSchema,
  }),
  baseNotificationJobSchema.extend({
    channel: z.literal("sales_dispatch_created"),
    payload: salesDispatchAssignedSchema,
  }),
]);
export type NotificationJobInput = z.infer<typeof notificationJobSchema>;
