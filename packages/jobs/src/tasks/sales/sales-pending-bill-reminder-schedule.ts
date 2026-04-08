import { db } from "@gnd/db";
import { whereSales } from "@gnd/sales/utils/where-queries";
import { getSettingAction } from "@gnd/settings";
import { type SalesPdfToken, tokenize } from "@gnd/utils/tokenizer";
import type { TaskName } from "../../schema";
import {
  getTaskEventConfigFromMeta,
  getTaskEventDefaultConfig,
} from "../../task-events/registry";
import type { NotificationJobInput } from "@notifications/schemas";
import { logger, schedules, task, tasks } from "@trigger.dev/sdk/v3";
import { getAppApiUrl } from "@utils/envs";
import { addDays } from "date-fns";

const baseApiUrl = getAppApiUrl();
const MAX_HISTORY_BREAKDOWN_ITEMS = 50;
const MAX_NOTIFICATION_BREAKDOWN_ITEMS = 25;
const MAX_DEV_MODE_DELIVERY = 5;
const isValidEmail = (value?: string | null) =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type ReminderRecipientRole = "customer" | "address";

type GroupedReminder = {
  salesRepId: number;
  salesRep: string;
  salesRepEmail: string;
  recipientId: number;
  recipientRole: ReminderRecipientRole;
  customerEmail: string;
  customerName: string;
  salesIds: number[];
  sales: Array<{
    saleId: number;
    orderId: string;
    po?: string | null;
    date: Date;
    total: number;
    due: number;
  }>;
};

type SkippedSaleBreakdown = {
  saleId: number;
  orderId: string;
  customerName: string;
  customerEmail?: string | null;
  addressEmail?: string | null;
  salesRepEmail?: string | null;
  reasons: string[];
  amountDue: number;
  grandTotal: number;
};

type SuccessfulRecipientBreakdown = {
  recipientRole: ReminderRecipientRole;
  recipientId: number;
  recipientName: string;
  recipientEmail: string;
  salesCount: number;
  totalPendingAmount: number;
  totalSalesAmount: number;
  sales: Array<{
    saleId: number;
    orderId: string;
    po?: string | null;
    date: Date;
    due: number;
    total: number;
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

async function sendAdminRunSummary(input: {
  authorId: number | null;
  triggerType: RunType;
  statusUsed: "active" | "inactive";
  filterUsed: Record<string, unknown> | null | undefined;
  foundSalesCount: number;
  validSalesCount: number;
  groupedRecipientCount: number;
  deliveredGroupCount: number;
  failedGroupCount: number;
  skippedSalesCount: number;
  totalPendingAmount: number;
  totalSalesAmount: number;
  successfulRecipients: SuccessfulRecipientBreakdown[];
  skippedSales: SkippedSaleBreakdown[];
}) {
  if (!input.authorId) {
    logger.warn(
      "Skipping admin schedule summary notification: missing author.",
    );
    return;
  }

  try {
    const successfulRecipients =
      input.successfulRecipients.length > MAX_NOTIFICATION_BREAKDOWN_ITEMS
        ? input.successfulRecipients.slice(0, MAX_NOTIFICATION_BREAKDOWN_ITEMS)
        : input.successfulRecipients;
    const skippedSales =
      input.skippedSales.length > MAX_NOTIFICATION_BREAKDOWN_ITEMS
        ? input.skippedSales.slice(0, MAX_NOTIFICATION_BREAKDOWN_ITEMS)
        : input.skippedSales;
    const successfulRecipientsTruncated = Math.max(
      0,
      input.successfulRecipients.length - successfulRecipients.length,
    );
    const skippedSalesTruncated = Math.max(
      0,
      input.skippedSales.length - skippedSales.length,
    );

    await tasks.trigger("notification", {
      channel: "sales_reminder_schedule_admin_notification",
      author: {
        id: input.authorId,
        role: "employee",
      },
      payload: {
        triggerType: input.triggerType,
        statusUsed: input.statusUsed,
        filterUsed: input.filterUsed || null,
        foundSalesCount: input.foundSalesCount,
        validSalesCount: input.validSalesCount,
        groupedRecipientCount: input.groupedRecipientCount,
        deliveredGroupCount: input.deliveredGroupCount,
        failedGroupCount: input.failedGroupCount,
        skippedSalesCount: input.skippedSalesCount,
        totalPendingAmount: input.totalPendingAmount,
        totalSalesAmount: input.totalSalesAmount,
        successfulRecipients,
        skippedSales,
        successfulRecipientsTruncated,
        skippedSalesTruncated,
      },
    } satisfies NotificationJobInput);
  } catch (error) {
    logger.error("Failed sending admin schedule summary notification", {
      error,
      eventName: EVENT_NAME,
      triggerType: input.triggerType,
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
  const notificationAuthor = await db.users.findFirst({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  const notificationAuthorId = notificationAuthor?.id || null;

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
    await sendAdminRunSummary({
      authorId: notificationAuthorId,
      triggerType: runType,
      statusUsed: "inactive",
      filterUsed: config.filter as Record<string, unknown>,
      foundSalesCount: 0,
      validSalesCount: 0,
      groupedRecipientCount: 0,
      deliveredGroupCount: 0,
      failedGroupCount: 0,
      skippedSalesCount: 0,
      totalPendingAmount: 0,
      totalSalesAmount: 0,
      successfulRecipients: [],
      skippedSales: [],
    });

    logger.info("Sales pending-bill reminder skipped (inactive schedule).");
    return { found: 0, grouped: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const filterWhere = whereSales(config.filter);
  const pendingSales = await db.salesOrders.findMany({
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
      customerId: true,
      billingAddressId: true,
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
  });
  const totalPendingAmount = pendingSales.reduce(
    (acc, sale) => acc + (sale.amountDue || 0),
    0,
  );
  const totalSalesAmount = pendingSales.reduce(
    (acc, sale) => acc + (sale.grandTotal || 0),
    0,
  );

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
        skippedSales: [],
        successfulRecipients: [],
      },
    });
    await sendAdminRunSummary({
      authorId: notificationAuthorId,
      triggerType: runType,
      statusUsed: config.status,
      filterUsed: config.filter as Record<string, unknown>,
      foundSalesCount: 0,
      validSalesCount: 0,
      groupedRecipientCount: 0,
      deliveredGroupCount: 0,
      failedGroupCount: 0,
      skippedSalesCount: 0,
      totalPendingAmount: 0,
      totalSalesAmount: 0,
      successfulRecipients: [],
      skippedSales: [],
    });
    logger.info("No pending sales bills found for reminder schedule.");
    return { found: 0, grouped: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const grouped = new Map<string, GroupedReminder>();
  const skippedSales: SkippedSaleBreakdown[] = [];
  let skipped = 0;

  for (const sale of pendingSales) {
    const customerId = sale.customerId ?? null;
    const addressId = sale.billingAddressId ?? null;
    const hasCustomerEmail = isValidEmail(sale.customer?.email?.trim());
    const hasAddressEmail = isValidEmail(sale.billingAddress?.email?.trim());
    const recipientRole: ReminderRecipientRole | null = hasCustomerEmail
      ? "customer"
      : hasAddressEmail
        ? "address"
        : null;
    const recipientId =
      recipientRole === "customer"
        ? customerId
        : recipientRole === "address"
          ? addressId
          : null;
    const customerEmail =
      recipientRole === "customer"
        ? sale.customer?.email?.trim()
        : sale.billingAddress?.email?.trim();
    const customerName =
      sale.customer?.name?.trim() ||
      sale.customer?.businessName?.trim() ||
      sale.billingAddress?.name?.trim() ||
      "Customer";
    const salesRepId = sale.salesRep?.id ?? notificationAuthorId;
    const salesRep = sale.salesRep?.name?.trim() || "Sales Team";
    const salesRepEmail = sale.salesRep?.email?.trim();
    const reasons: string[] = [];

    if (!recipientRole) reasons.push("missing_customer_and_address_email");
    if (recipientRole && !recipientId) reasons.push("missing_recipient_id");
    if (!customerEmail || !isValidEmail(customerEmail))
      reasons.push("invalid_recipient_email");
    if (!salesRepId) reasons.push("missing_sales_rep_id");
    if (!salesRepEmail || !isValidEmail(salesRepEmail))
      reasons.push("invalid_sales_rep_email");

    if (reasons.length) {
      skipped += 1;
      skippedSales.push({
        saleId: sale.id,
        orderId: sale.orderId,
        customerName,
        customerEmail: sale.customer?.email?.trim() || null,
        addressEmail: sale.billingAddress?.email?.trim() || null,
        salesRepEmail: salesRepEmail || null,
        reasons,
        amountDue: sale.amountDue || 0,
        grandTotal: sale.grandTotal || 0,
      });
      continue;
    }

    const key = `${salesRepId}|${recipientRole}|${recipientId}`;
    const po = (sale.meta as { po?: string | null } | null)?.po;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        salesRepId,
        salesRep,
        salesRepEmail,
        recipientId,
        recipientRole,
        customerEmail,
        customerName,
        salesIds: [sale.id],
        sales: [
          {
            saleId: sale.id,
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
      saleId: sale.id,
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
        skippedSales,
        successfulRecipients: [],
      },
    });
    await sendAdminRunSummary({
      authorId: notificationAuthorId,
      triggerType: runType,
      statusUsed: config.status,
      filterUsed: config.filter as Record<string, unknown>,
      foundSalesCount: pendingSales.length,
      validSalesCount: pendingSales.length - skipped,
      groupedRecipientCount: 0,
      deliveredGroupCount: 0,
      failedGroupCount: 0,
      skippedSalesCount: skipped,
      totalPendingAmount,
      totalSalesAmount,
      successfulRecipients: [],
      skippedSales,
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
  logger.info("Sales pending-bill reminder groups prepared", {
    groups: Array.from(grouped.values()).map((g) => ({
      salesRepId: g.salesRepId,
      recipientRole: g.recipientRole,
      recipientId: g.recipientId,
      customerEmail: g.customerEmail,
      salesCount: g.sales.length,
    })),
  });
  const shouldLimitEmails =
    process.env.NODE_ENV === "development" || runType === "test";
  const allGroups = Array.from(grouped.values());
  const groupsToSend = shouldLimitEmails
    ? allGroups.slice(0, MAX_DEV_MODE_DELIVERY)
    : allGroups;
  const cappedGroupsCount = Math.max(0, allGroups.length - groupsToSend.length);
  if (cappedGroupsCount > 0) {
    logger.info("Sales pending-bill reminder capped by environment", {
      runType,
      nodeEnv: process.env.NODE_ENV,
      maxEmailsPerRun: MAX_DEV_MODE_DELIVERY,
      cappedGroupsCount,
    });
  }
  const expiry = addDays(new Date(), 7).toISOString();
  let sent = 0;
  let failed = 0;
  const successfulRecipients: SuccessfulRecipientBreakdown[] = [];

  for (const group of groupsToSend) {
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
        recipients: [
          {
            ids: [group.recipientId],
            role: group.recipientRole,
          },
        ],
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
      successfulRecipients.push({
        recipientRole: group.recipientRole,
        recipientId: group.recipientId,
        recipientName: group.customerName,
        recipientEmail: group.customerEmail,
        salesCount: group.sales.length,
        totalPendingAmount: group.sales.reduce(
          (acc, sale) => acc + sale.due,
          0,
        ),
        totalSalesAmount: group.sales.reduce(
          (acc, sale) => acc + sale.total,
          0,
        ),
        sales: group.sales,
      });
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
      emailCapApplied: shouldLimitEmails,
      maxEmailsPerRun: shouldLimitEmails ? MAX_DEV_MODE_DELIVERY : null,
      cappedGroupsCount,
      skippedSales:
        skippedSales.length > MAX_HISTORY_BREAKDOWN_ITEMS
          ? skippedSales.slice(0, MAX_HISTORY_BREAKDOWN_ITEMS)
          : skippedSales,
      successfulRecipients:
        successfulRecipients.length > MAX_HISTORY_BREAKDOWN_ITEMS
          ? successfulRecipients.slice(0, MAX_HISTORY_BREAKDOWN_ITEMS)
          : successfulRecipients,
      skippedSalesTruncated: Math.max(
        0,
        skippedSales.length - MAX_HISTORY_BREAKDOWN_ITEMS,
      ),
      successfulRecipientsTruncated: Math.max(
        0,
        successfulRecipients.length - MAX_HISTORY_BREAKDOWN_ITEMS,
      ),
    },
  });
  await sendAdminRunSummary({
    authorId: notificationAuthorId,
    triggerType: runType,
    statusUsed: config.status,
    filterUsed: config.filter as Record<string, unknown>,
    foundSalesCount: pendingSales.length,
    validSalesCount: pendingSales.length - skipped,
    groupedRecipientCount: grouped.size,
    deliveredGroupCount: sent,
    failedGroupCount: failed,
    skippedSalesCount: skipped,
    totalPendingAmount,
    totalSalesAmount,
    successfulRecipients,
    skippedSales,
  });

  return {
    found: pendingSales.length,
    grouped: grouped.size,
    sent,
    skipped,
    failed,
  };
}
