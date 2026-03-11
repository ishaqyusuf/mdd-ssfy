import type { NotificationHandler } from "../base";
import {
  type SalesEmailReminderInput,
  type SalesEmailReminderTags,
  salesEmailReminderSchema,
} from "../schemas";

export const salesEmailReminder: NotificationHandler = {
  schema: salesEmailReminderSchema,
  createActivityWithoutContact: true,
  createActivity(data: SalesEmailReminderInput, author) {
    const docType = data.type === "quote" ? "Quote" : "Invoice";
    const payload: SalesEmailReminderTags = {
      type: "sales_email_reminder",
      source: "system",
      priority: 5,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      salesCount: data.sales.length,
      reminderType: data.type,
      salesNo: data.sales.map((a) => a.orderId),
      paymentToken: data.paymentToken || null,
      pdfToken: data.pdfToken || null,
    };

    return {
      type: "sales_email_reminder",
      source: "system",
      subject: "Sales reminder email sent",
      headline: `${docType} reminder sent to ${data.customerName} (${data.customerEmail}) for ${data.sales.length} document${data.sales.length > 1 ? "s" : ""}.`,
      authorId: author.id,
      tags: payload,
    };
  },
  createEmail(data, author, user, args) {
    const isQuote = data.type === "quote";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "";
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.APP_API_URL ||
      appUrl;
    const paymentLink =
      data.paymentLink ||
      (data.paymentToken && appUrl
        ? `${appUrl}/checkout/${data.paymentToken}`
        : undefined);
    const pdfLink =
      data.pdfLink ||
      (data.pdfToken && apiUrl
        ? `${apiUrl}/download/sales?token=${data.pdfToken}&download=true`
        : undefined);

    return {
      ...args,
      template: "sales-email-reminder",
      to: [data.customerEmail],
      from: `GND Millwork <${data.salesRepEmail.split("@")[0]}@gndprodesk.com>`,
      subject: `${data.salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
      data: {
        isQuote,
        customerName: data.customerName,
        paymentLink: paymentLink || undefined,
        pdfLink: pdfLink || undefined,
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
