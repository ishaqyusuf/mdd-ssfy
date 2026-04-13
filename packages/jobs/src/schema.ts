import { z } from "zod";
import {
  createSalesDispatchItemsSchema,
  createSalesDispatchSchema,
} from "@gnd/utils/sales";
import { salesType } from "@gnd/utils/constants";
import { salesCheckoutSuccessSchema } from "@notifications/schemas";
import { ChannelName } from "@notifications/channels";
export {
  sendSalesEmailSchema,
  type SendSalesEmailPayload,
} from "./tasks/sales/send-sales-email-schema";
// import { salesQueryParamsSchema } from "@api/schemas/sales";

export const taskNames = [
  "create-sales-dispatch",
  "create-sales-history",
  "mark-sales-as-completed",
  "run-inventory-full-import-now",
  "run-inventory-full-import-test",
  "run-dispatch-duplicate-sweeper-now",
  "run-dispatch-duplicate-sweeper-test",
  "run-unit-invoice-duplicate-sweeper-now",
  "run-sales-pending-bill-reminder-now",
  "run-sales-pending-bill-reminder-test",
  "sales-rep-payment-received-notification",
  "send-login-email",
  "send-password-reset-code",
  "send-password-reset-to-default-email",
  "send-sales-email",
  "send-sales-reminder",
  "send-storefront-welcome-email",
  "send-storefront-order-confirmation-email",
  "send-storefront-magic-login-code-email",
  "send-storefront-signup-validate-email",
  "send-gnd-sales-email",
  "send-storefront-abandoned-cart-email",
  "send-storefront-customer-anniversary-email",
  "send-storefront-delivery-confirmation-email",
  "send-storefront-email-verified-email",
  "send-storefront-hot-deals-email",
  "send-storefront-order-cancellation-email",
  "send-storefront-order-completed-review-email",
  "send-storefront-order-status-update-email",
  "send-storefront-password-created-email",
  "send-storefront-password-reset-completed-email",
  "send-storefront-product-review-email",
  "send-storefront-promotional-email",
  "send-storefront-shipping-confirmation-email",
  "send-storefront-win-back-email",
  "sync-sales-inventory-line-items",
  "sync-dyke-step-to-inventory",
  "update-sales-control",
  "sales-commission",
  "reset-sales-control",
  "notification",
] as const;
export type TaskName = (typeof taskNames)[number];

const author = z.object({
  id: z.number(),
  name: z.string(),
});
export const createSalesDispatchSchemaTask = z.object({
  delivery: createSalesDispatchSchema,
  itemData: createSalesDispatchItemsSchema,
});
export type CreateSalesDispatchSchemaTask = z.infer<
  typeof createSalesDispatchSchemaTask
>;
export const createSalesHistorySchemaTask = z.object({
  author: author,
  salesNo: z.string(),
  salesType: z.enum(salesType),
});
export type CreateSalesHistorySchemaTask = z.infer<
  typeof createSalesHistorySchemaTask
>;
export const sendSalesReminderSchema = z.object({
  salesRepId: z.number().optional().nullable(),
  sales: z.array(
    z.object({
      type: z.enum(["order", "quote"]),
      downloadToken: z.string().optional().nullable(),
      paymentToken: z.string().optional().nullable(),
      salesIds: z.array(z.number()),
      customerEmail: z.string(),
      customerName: z.string(),
    }),
  ),
  salesRepEmail: z.string(),
  salesRep: z.string(),
});
export type SendSalesReminderPayload = z.infer<typeof sendSalesReminderSchema>;
export const runFullInventoryImportTaskSchema = z.object({
  categoryId: z.number().optional().nullable(),
  strategy: z.enum(["handcrafted", "optimized"]).optional().default("optimized"),
  compare: z.boolean().optional().default(false),
  reset: z.boolean().optional().default(false),
  source: z.enum(["manual", "event", "job"]).optional().default("job"),
});
export type RunFullInventoryImportTaskPayload = z.infer<
  typeof runFullInventoryImportTaskSchema
>;
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

export const syncSalesInventoryLineItemsSchemaTask = z.object({
  salesOrderId: z.number(),
  source: z
    .enum(["old-form", "new-form", "manual", "repair"])
    .default("manual"),
  triggeredByUserId: z.number().optional().nullable(),
});
export type SyncSalesInventoryLineItemsSchemaTask = z.infer<
  typeof syncSalesInventoryLineItemsSchemaTask
>;

export const syncDykeStepToInventorySchemaTask = z.object({
  stepId: z.number(),
  compare: z.boolean().optional().default(false),
  strategy: z.enum(["handcrafted", "optimized"]).optional().default("optimized"),
  source: z.enum(["manual", "event", "job"]).optional().default("event"),
});
export type SyncDykeStepToInventorySchemaTask = z.infer<
  typeof syncDykeStepToInventorySchemaTask
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
    }),
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
  name: z.string(),
  validationLink: z.string().url(),
});
export type SendStorefrontSignupValidateEmailPayload = z.infer<
  typeof sendStorefrontSignupValidateEmailSchema
>;

export const sendGndSalesEmailSchema = z.object({
  email: z.string().email(),
  isQuote: z.boolean().optional(),
  customerName: z.string(),
  paymentLink: z.string().url().optional(),
  pdfLink: z.string().url().optional(),
  sales: z.array(
    z.object({
      orderId: z.string(),
      po: z.string().optional(),
      date: z.string(), // Using string for date to avoid serialization issues
      total: z.number(),
      due: z.number(),
    }),
  ),
});
export type SendGndSalesEmailPayload = z.infer<typeof sendGndSalesEmailSchema>;

export const sendStorefrontAbandonedCartEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  cartUrl: z.string().url().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      }),
    )
    .optional(),
});
export type SendStorefrontAbandonedCartEmailPayload = z.infer<
  typeof sendStorefrontAbandonedCartEmailSchema
>;

export const sendStorefrontCustomerAnniversaryEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  anniversaryYear: z.number().optional(),
  discountCode: z.string().optional(),
  storeUrl: z.string().url().optional(),
});
export type SendStorefrontCustomerAnniversaryEmailPayload = z.infer<
  typeof sendStorefrontCustomerAnniversaryEmailSchema
>;

export const sendStorefrontDeliveryConfirmationEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string().optional(),
  storeUrl: z.string().url().optional(),
});
export type SendStorefrontDeliveryConfirmationEmailPayload = z.infer<
  typeof sendStorefrontDeliveryConfirmationEmailSchema
>;

export const sendStorefrontHotDealsEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  products: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        imageUrl: z.string().url(),
        productUrl: z.string().url(),
      }),
    )
    .optional(),
});
export type SendStorefrontHotDealsEmailPayload = z.infer<
  typeof sendStorefrontHotDealsEmailSchema
>;

export const sendStorefrontOrderCancellationEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string().optional(),
});
export type SendStorefrontOrderCancellationEmailPayload = z.infer<
  typeof sendStorefrontOrderCancellationEmailSchema
>;

export const sendStorefrontOrderCompletedReviewEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string().optional(),
  reviewUrl: z.string().url().optional(),
});
export type SendStorefrontOrderCompletedReviewEmailPayload = z.infer<
  typeof sendStorefrontOrderCompletedReviewEmailSchema
>;

export const sendStorefrontOrderStatusUpdateEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string().optional(),
  orderStatus: z.string().optional(),
  orderUrl: z.string().url().optional(),
});
export type SendStorefrontOrderStatusUpdateEmailPayload = z.infer<
  typeof sendStorefrontOrderStatusUpdateEmailSchema
>;

export const sendStorefrontPasswordResetCompletedEmailSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  loginUrl: z.string().url(),
});
export type SendStorefrontPasswordResetCompletedEmailPayload = z.infer<
  typeof sendStorefrontPasswordResetCompletedEmailSchema
>;

export const sendStorefrontProductReviewEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  productName: z.string().optional(),
  productReviewUrl: z.string().url().optional(),
});
export type SendStorefrontProductReviewEmailPayload = z.infer<
  typeof sendStorefrontProductReviewEmailSchema
>;

export const sendStorefrontPromotionalEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  promoCode: z.string().optional(),
  promoUrl: z.string().url().optional(),
  promoImageUrl: z.string().url().optional(),
});
export type SendStorefrontPromotionalEmailPayload = z.infer<
  typeof sendStorefrontPromotionalEmailSchema
>;

export const sendStorefrontShippingConfirmationEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  orderId: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});
export type SendStorefrontShippingConfirmationEmailPayload = z.infer<
  typeof sendStorefrontShippingConfirmationEmailSchema
>;

export const sendStorefrontWinBackEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  discountCode: z.string().optional(),
  storeUrl: z.string().url().optional(),
});
export type SendStorefrontWinBackEmailPayload = z.infer<
  typeof sendStorefrontWinBackEmailSchema
>;

export const sendStorefrontEmailVerifiedEmailSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});
export type SendStorefrontEmailVerifiedEmailPayload = z.infer<
  typeof sendStorefrontEmailVerifiedEmailSchema
>;

export const sendStorefrontPasswordCreatedEmailSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});
export type SendStorefrontPasswordCreatedEmailPayload = z.infer<
  typeof sendStorefrontPasswordCreatedEmailSchema
>;

export const markSalesAsCompletedSchema = z.object({
  ids: z.array(z.number()),
  authorName: z.string(),
});
