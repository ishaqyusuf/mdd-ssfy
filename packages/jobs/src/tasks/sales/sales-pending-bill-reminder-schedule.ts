import { db } from "@gnd/db";
import { getAppApiUrl } from "@utils/envs";
import { type NotificationJobInput } from "@notifications/schemas";
import { logger, schedules, task, tasks } from "@trigger.dev/sdk/v3";
import { addDays } from "date-fns";
import { tokenize, type SalesPdfToken } from "@gnd/utils/tokenizer";
import { TaskName } from "@jobs/schema";
import { whereSales } from "@gnd/sales/utils/where-queries";
import { getSettingAction } from "@gnd/settings";
import {
  getTaskEventConfigFromMeta,
  getTaskEventDefaultConfig,
} from "@jobs/task-events/registry";

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
    return runPendingBillReminder("scheduled");
  },
});

const EVENT_NAME = "sales-pending-bill-reminder-schedule";
const id: TaskName = "run-sales-pending-bill-reminder-now";
export const runSalesPendingBillReminderNow = task({
  id,
  run: async () => {
    return runPendingBillReminder("now");
  },
});

const testId: TaskName = "run-sales-pending-bill-reminder-test";
export const runSalesPendingBillReminderTest = task({
  id: testId,
  run: async () => {
    return runPendingBillReminder("test");
  },
});

type RunType = "scheduled" | "now" | "test";

async function writeScheduleHistory(input: {
  eventName: string;
  value: number;
  meta: Record<string, unknown>;
}) {
  try {
    await db.scheduleHistory.create({
      data: {
        eventName: input.eventName,
        value: input.value,
        meta: input.meta,
      },
    });
  } catch (error) {
    logger.error("Failed writing schedule history", {
      error,
      eventName: input.eventName,
    });
  }
}

async function runPendingBillReminder(runType: RunType) {
  const defaultConfig = getTaskEventDefaultConfig(EVENT_NAME);
  const settings = await getSettingAction("task-events-settings", db);
  const config = (() => {
    try {
      return getTaskEventConfigFromMeta(EVENT_NAME, settings?.meta || {});
    } catch (error) {
      logger.error("Invalid task event config, using defaults", {
        error,
        eventName: EVENT_NAME,
      });
      return defaultConfig;
    }
  })();

  if (config.status === "inactive" && runType === "scheduled") {
    await writeScheduleHistory({
      eventName: EVENT_NAME,
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        filterUsed: config.filter,
        skipped: true,
        reason: "inactive",
      },
    });

    logger.info("Sales pending-bill reminder skipped (inactive schedule).");
    return { found: 0, grouped: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const filterWhere = whereSales(config.filter as any);
  const [pendingSales, fallbackAuthor] = await Promise.all([
      db.salesOrders.findMany({
        where: filterWhere
          ? {
              AND: [
                {
                  deletedAt: null,
                  type: "order",
                  amountDue: {
                    gt: 0,
                  },
                },
                filterWhere,
              ],
            }
          : {
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
    await writeScheduleHistory({
      eventName: EVENT_NAME,
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        filterUsed: config.filter,
        found: 0,
        grouped: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      },
    });
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
    await writeScheduleHistory({
      eventName: EVENT_NAME,
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        filterUsed: config.filter,
        found: pendingSales.length,
        grouped: 0,
        sent: 0,
        skipped,
        failed: 0,
      },
    });
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
    if (runType === "test") {
      sent += 1;
      continue;
    }
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

  await writeScheduleHistory({
    eventName: EVENT_NAME,
    value: sent,
    meta: {
      triggerType: runType,
      statusUsed: config.status,
      filterUsed: config.filter,
      found: pendingSales.length,
      grouped: grouped.size,
      sent,
      skipped,
      failed,
      testMode: runType === "test",
    },
  });

  return {
    found: pendingSales.length,
    grouped: grouped.size,
    sent,
    skipped,
    failed,
  };
}
