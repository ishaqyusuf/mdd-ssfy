import type { NotificationHandler } from "../base";
import {
  type SalesEmailReminderInput,
  salesEmailReminderSchema,
} from "../schemas";

export const salesEmailReminder: NotificationHandler = {
  schema: salesEmailReminderSchema,
  createActivityWithoutContact: true,
  createActivity(data: SalesEmailReminderInput, author) {
    const docType = data.type === "quote" ? "Quote" : "Invoice";
    return {
      type: "sales_email_reminder",
      source: "system",
      subject: "Sales reminder email sent",
      headline: `${docType} reminder sent to ${data.customerName} (${data.customerEmail}) for ${data.sales.length} document${data.sales.length > 1 ? "s" : ""}.`,
      authorId: author.id,
      tags: {
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        salesCount: data.sales.length,
        reminderType: data.type,
        salesNo: data.sales.map((a) => a.orderId),
      },
    };
  },
  createEmail(data, author, user, args) {
    const isQuote = data.type === "quote";
    return {
      ...args,
      template: "sales-email-reminder",
      to: [data.customerEmail],
      from: `GND Millwork <${data.salesRepEmail.split("@")[0]}@gndprodesk.com>`,
      subject: `${data.salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
      data: {
        isQuote,
        customerName: data.customerName,
        paymentLink: data.paymentLink || undefined,
        pdfLink: data.pdfLink || undefined,
        sales: data.sales.map((sale) => ({
          ...sale,
          date:
            sale.date instanceof Date ? sale.date : new Date(String(sale.date)),
          po: sale.po || undefined,
        })),
      },
    };
  },
};
