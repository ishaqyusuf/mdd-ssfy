import type { NotificationHandler } from "../base";
import {
  type SalesCheckoutSuccessInput,
  type SalesCheckoutSuccessTags,
  salesCheckoutSuccessSchema,
} from "../schemas";

export const salesCheckoutSuccess: NotificationHandler = {
  schema: salesCheckoutSuccessSchema,
  createActivity(data: SalesCheckoutSuccessInput, author, user) {
    const orderLabel =
      data.orderNos.length === 1
        ? `order ${data.orderNos[0]}`
        : `${data.orderNos.length} orders`;
    const payload: SalesCheckoutSuccessTags = {
      type: "sales_checkout_success",
      source: "system",
      priority: 5,
      orderNos: data.orderNos,
      customerName: data.customerName,
      totalAmount: data.totalAmount,
    };

    return {
      type: "sales_checkout_success",
      source: "system",
      subject: "Payment received",
      headline: data.customerName
        ? `${data.customerName} completed payment for ${orderLabel}.`
        : `Payment received for ${orderLabel}.`,
      note:
        typeof data.totalAmount === "number"
          ? `Total received: $${data.totalAmount.toFixed(2)}`
          : undefined,
      authorId: author.id,
      tags: payload,
    };
  },
};
