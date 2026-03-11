import type { Db } from "@gnd/db";
import {
  tokenize,
  type SalesPdfToken,
  type SalesPaymentTokenSchema,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { z } from "zod";
import type { NotificationHandler, UserData } from "../base";
import {
  type SalesEmailReminderInput,
  type SimpleSalesEmailReminderInput,
  type SimpleSalesEmailReminderTags,
  salesEmailReminderSchema,
} from "../schemas";
import { salesEmailReminder } from "./sales-email-reminder";

const simpleSalesEmailReminderResolvedSchema = salesEmailReminderSchema.extend({
  salesId: z.number(),
  payPlan: z
    .union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)])
    .optional()
    .nullable(),
  attachInvoice: z.boolean().optional(),
});

type SimpleSalesEmailReminderResolvedInput = z.infer<
  typeof simpleSalesEmailReminderResolvedSchema
>;

function toPayPlanAmount(
  amountDue: number,
  payPlan?: 25 | 50 | 75 | 100 | null,
) {
  if (payPlan == null) return null;
  return Number((((amountDue || 0) * payPlan) / 100).toFixed(2));
}

function resolveBaseUrls() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.APP_API_URL || appUrl;
  return { appUrl, apiUrl };
}

async function buildReminderData(
  db: Db,
  input: SimpleSalesEmailReminderInput,
  author: UserData,
): Promise<SimpleSalesEmailReminderResolvedInput> {
  const sale = await db.salesOrders.findFirstOrThrow({
    where: { id: input.salesId },
    select: {
      id: true,
      type: true,
      orderId: true,
      meta: true,
      amountDue: true,
      grandTotal: true,
      createdAt: true,
      customer: {
        select: {
          name: true,
          email: true,
          walletId: true,
        },
      },
      billingAddress: {
        select: {
          name: true,
          email: true,
        },
      },
      salesRep: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const customerEmail = sale.customer?.email || sale.billingAddress?.email;
  if (!customerEmail) {
    throw new Error(
      `Missing customer email for simple sales reminder, salesId=${input.salesId}`,
    );
  }
  const customerName =
    sale.customer?.name || sale.billingAddress?.name || "Customer";
  const saleType = sale.type === "quote" ? "quote" : "order";
  const salesRepName = sale.salesRep?.name || author.name || "Sales Rep";
  const salesRepEmail = sale.salesRep?.email || author.email;
  if (!salesRepEmail) {
    throw new Error(
      `Missing sales rep email for simple sales reminder, salesId=${input.salesId}`,
    );
  }

  const { appUrl, apiUrl } = resolveBaseUrls();
  const expiry = addDays(new Date(), 7).toISOString();
  const pdfToken = input.attachInvoice
    ? tokenize({
        salesIds: [sale.id],
        expiry,
        mode: saleType,
      } satisfies SalesPdfToken)
    : null;

  let paymentToken: string | null = null;
  if (input.payPlan != null) {
    const walletId = sale.customer?.walletId;
    if (!walletId) {
      throw new Error(
        `Missing walletId for payment reminder, salesId=${input.salesId}`,
      );
    }
    paymentToken = tokenize({
      salesIds: [sale.id],
      expiry,
      percentage: input.payPlan,
      amount: toPayPlanAmount(sale.amountDue || 0, input.payPlan),
      walletId,
    } satisfies SalesPaymentTokenSchema);
  }

  return {
    salesId: sale.id,
    payPlan: input.payPlan ?? null,
    attachInvoice: input.attachInvoice,
    note: input.note || undefined,
    type: saleType,
    customerEmail,
    customerName,
    salesRep: salesRepName,
    salesRepEmail,
    paymentToken,
    pdfToken,
    paymentLink:
      paymentToken && appUrl ? `${appUrl}/checkout/${paymentToken}` : null,
    pdfLink:
      pdfToken && apiUrl
        ? `${apiUrl}/download/sales?token=${pdfToken}&download=true`
        : null,
    sales: [
      {
        orderId: sale.orderId,
        po: (sale.meta as any)?.po,
        date: sale.createdAt || new Date(),
        total: sale.grandTotal || 0,
        due: sale.amountDue || 0,
      },
    ],
  };
}

export const simpleSalesEmailReminder: NotificationHandler = {
  schema: simpleSalesEmailReminderResolvedSchema,
  createActivityWithoutContact: true,
  async extendData(db, data: SimpleSalesEmailReminderInput, author: UserData) {
    return buildReminderData(db, data, author);
  },
  createActivity: salesEmailReminder.createActivity,
  createEmail(data: SalesEmailReminderInput, author, user, args) {
    return salesEmailReminder.createEmail!(data, author, user, args);
  },
};
