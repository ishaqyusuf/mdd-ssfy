import { db } from "@gnd/db";
import { getAppApiUrl } from "@utils/envs";
import { type NotificationJobInput } from "@notifications/schemas";
import { logger, schedules, task, tasks } from "@trigger.dev/sdk/v3";
import { addDays } from "date-fns";
import { tokenize, type SalesPdfToken } from "@gnd/utils/tokenizer";

const baseApiUrl = getAppApiUrl();
const isValidEmail = (value?: string | null) =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type GroupedReminder = {
  salesRepId: number;
  salesRep: string;
  salesRepEmail: string;
  customerEmail: string;
  customerName: string;
  salesIds: number[];
  sales: Array<{
    orderId: string;
    po?: string | null;
    date: Date;
    total: number;
    due: number;
  }>;
};

export const salesPendingBillReminderSchedule = schedules.task({
  id: "sales-pending-bill-reminder-schedule",
  cron: {
    pattern: "0 8 * * 1",
    timezone: "America/New_York",
  },
  maxDuration: 300,
  queue: {
    concurrencyLimit: 1,
  },
  run: async () => {
    return runPendingBillReminder();
  },
});

export const runSalesPendingBillReminderNow = task({
  id: "run-sales-pending-bill-reminder-now",
  run: async () => {
    return runPendingBillReminder();
  },
});

async function runPendingBillReminder() {
  const [pendingSales, fallbackAuthor] = await Promise.all([
      db.salesOrders.findMany({
        where: {
          deletedAt: null,
          type: "order",
          amountDue: {
            gt: 0,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          orderId: true,
          createdAt: true,
          grandTotal: true,
          amountDue: true,
          meta: true,
          salesRep: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          customer: {
            select: {
              name: true,
              businessName: true,
              email: true,
            },
          },
          billingAddress: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      db.users.findFirst({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
    ]);

  if (!pendingSales.length) {
    logger.info("No pending sales bills found for reminder schedule.");
    return { found: 0, grouped: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const grouped = new Map<string, GroupedReminder>();
  let skipped = 0;

  for (const sale of pendingSales) {
    const customerEmail =
      sale.customer?.email?.trim() || sale.billingAddress?.email?.trim();
    const customerName =
      sale.customer?.name?.trim() ||
      sale.customer?.businessName?.trim() ||
      sale.billingAddress?.name?.trim() ||
      "Customer";
    const salesRepId = sale.salesRep?.id ?? fallbackAuthor?.id;
    const salesRep = sale.salesRep?.name?.trim() || "Sales Team";
    const salesRepEmail = sale.salesRep?.email?.trim();

    if (
      !customerEmail ||
      !isValidEmail(customerEmail) ||
      !salesRepId ||
      !salesRepEmail ||
      !isValidEmail(salesRepEmail)
    ) {
      skipped += 1;
      continue;
    }

    const key = `${salesRepId}|${customerEmail}`;
    const po = (sale.meta as { po?: string | null } | null)?.po;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        salesRepId,
        salesRep,
        salesRepEmail,
        customerEmail,
        customerName,
        salesIds: [sale.id],
        sales: [
          {
            orderId: sale.orderId,
            po: po || null,
            date: sale.createdAt || new Date(),
            total: sale.grandTotal || 0,
            due: sale.amountDue || 0,
          },
        ],
      });
      continue;
    }

    existing.salesIds.push(sale.id);
    existing.sales.push({
      orderId: sale.orderId,
      po: po || null,
      date: sale.createdAt || new Date(),
      total: sale.grandTotal || 0,
      due: sale.amountDue || 0,
    });
  }

  if (!grouped.size) {
    logger.info("No valid pending-bill reminder groups after filtering.");
    return {
      found: pendingSales.length,
      grouped: 0,
      sent: 0,
      skipped,
      failed: 0,
    };
  }

  const expiry = addDays(new Date(), 7).toISOString();
  let sent = 0;
  let failed = 0;

  for (const group of grouped.values()) {
    try {
      const downloadToken = tokenize({
        salesIds: group.salesIds,
        expiry,
        mode: "order",
      } satisfies SalesPdfToken);

      await tasks.trigger("notification", {
        channel: "sales_email_reminder",
        author: {
          id: group.salesRepId,
          role: "employee",
        },
        payload: {
          type: "order",
          customerEmail: group.customerEmail,
          customerName: group.customerName,
          salesRep: group.salesRep,
          salesRepEmail: group.salesRepEmail,
          pdfLink: `${baseApiUrl}/download/sales?token=${downloadToken}&download=true`,
          paymentLink: null,
          sales: group.sales,
        },
      } satisfies NotificationJobInput);
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Failed sending sales pending-bill reminder group", {
        error,
        customerEmail: group.customerEmail,
        salesRepId: group.salesRepId,
        salesCount: group.sales.length,
      });
    }
  }

  logger.info("Sales pending-bill reminder schedule completed", {
    found: pendingSales.length,
    grouped: grouped.size,
    sent,
    skipped,
    failed,
  });

  return {
    found: pendingSales.length,
    grouped: grouped.size,
    sent,
    skipped,
    failed,
  };
}
