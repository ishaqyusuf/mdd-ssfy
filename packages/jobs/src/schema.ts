import { z } from "zod";
import {
  createSalesDispatchItemsSchema,
  createSalesDispatchSchema,
} from "@gnd/utils/sales";
// import { salesQueryParamsSchema } from "@api/schemas/sales";

export const taskNames = [
  "create-sales-dispatch",
  "create-sales-history",
  "mark-sales-as-completed",
  "sales-online-payment-action-notification",
  "send-login-email",
  "send-password-reset-code",
  "send-password-reset-to-default-email",
  "update-sales-control",
  "sales-commission",
] as const;
export type TaskName = (typeof taskNames)[number];
export const createSalesDispatchSchemaTask = z.object({
  delivery: createSalesDispatchSchema,
  itemData: createSalesDispatchItemsSchema,
});
export type CreateSalesDispatchSchemaTask = z.infer<
  typeof createSalesDispatchSchemaTask
>;
export const createSalesHistorySchemaTask = z.object({
  authorName: z.string(),
  salesId: z.number(),
  salesIncludeData: z.any(),
});
export type CreateSalesHistorySchemaTask = z.infer<
  typeof createSalesHistorySchemaTask
>;
export const sendSalesEmailSchema = z.object({
  emailType: z
    .enum(["with payment", "with part payment", "without payment"])
    .default("without payment")
    .optional()
    .nullable(),
  printType: z.enum(["order", "quote"]),
  salesIds: z.array(z.number()).optional().nullable(),
  salesNos: z.array(z.string()).optional().nullable(),
});
export type SendSalesEmailPayload = z.infer<typeof sendSalesEmailSchema>;

export const sendLoginEmailSchema = z.object({
  //validate email
  email: z.string().email("Please enter a valid email address"),
});
export type SendLoginEmailPayload = z.infer<typeof sendLoginEmailSchema>;
export const sendPasswordResetCodeSchema = z.object({
  //validate email
  email: z.string().email("Please enter a valid email address"),
});
export type SendPasswordResetCodePayload = z.infer<typeof sendLoginEmailSchema>;

export const passwordResetToDefaultSchema = z.object({
  //validate email
  id: z.number(),
});
export type PasswordResetToDefaultSchema = z.infer<
  typeof passwordResetToDefaultSchema
>;
export const salesPaymentNotificationEmailSchema = z.object({
  repName: z.string().optional().nullable(),
  customerName: z.string(),
  amount: z.number(),
  ordersNo: z.array(z.string()),
  email: z.string(),
});
export const markSalesAsCompletedSchema = z.object({
  ids: z.array(z.number()),
  authorName: z.string(),
});
