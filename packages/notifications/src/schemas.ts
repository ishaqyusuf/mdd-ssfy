import { z } from "zod";

export const createActivitySchema = z.object({
  // teamId: z.string().uuid(),
  userId: z.number().optional(),
  userIds: z.array(z.number()), ///number().optional(),
  type: z.enum(["sales_checkout_success"]),
  source: z.enum(["system", "user"]).default("system"),
  priority: z.number().int().min(1).max(10).default(5),
  // groupId: z.string().uuid().optional(), // Links related activities together
  metadata: z.record(z.string(), z.any()), // Flexible - any JSON object
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  locale: z.string().optional(),
  avatar_url: z.string().optional(),
  team_id: z.string().uuid(),
  role: z.enum(["owner", "member"]).optional(),
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

// Notification types map - all available notification types with their data structures
export type NotificationTypes = {
  sales_checkout_success: SalesCheckoutSuccessInput;
};
