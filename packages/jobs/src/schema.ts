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
  "send-storefront-welcome-email",
  "send-storefront-order-confirmation-email",
  "send-storefront-magic-login-code-email",
  "send-storefront-signup-validate-email",
  "update-sales-control",
  "sales-commission",
  "reset-sales-control",
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

export const sendStorefrontWelcomeEmailSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});
export type SendStorefrontWelcomeEmailPayload = z.infer<
  typeof sendStorefrontWelcomeEmailSchema
>;

export const sendStorefrontOrderConfirmationEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string(),
  orderDate: z.string(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ),
  total: z.number(),
});
export type SendStorefrontOrderConfirmationEmailPayload = z.infer<
  typeof sendStorefrontOrderConfirmationEmailSchema
>;

export const sendStorefrontMagicLoginCodeEmailSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});
export type SendStorefrontMagicLoginCodeEmailPayload = z.infer<
  typeof sendStorefrontMagicLoginCodeEmailSchema
>;

export const sendStorefrontSignupValidateEmailSchema = z.object({
  email: z.string().email(),
  validationLink: z.string().url(),
});
export type SendStorefrontSignupValidateEmailPayload = z.infer<
  typeof sendStorefrontSignupValidateEmailSchema
>;

export const markSalesAsCompletedSchema = z.object({
  ids: z.array(z.number()),
  authorName: z.string(),
});
