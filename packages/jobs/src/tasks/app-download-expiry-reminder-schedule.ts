import { db } from "@gnd/db";
import { getSettingAction, updateSettingsMeta } from "@gnd/settings";
import { getAppApiUrl, getAppUrl, getDevEmail } from "@gnd/utils/envs";
import { format, subDays } from "date-fns";
import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import type { TaskName } from "../schema";
import {
  getTaskEventConfigFromMeta,
  getTaskEventDefaultConfig,
} from "../task-events/registry";

const EVENT_NAME = "app-download-expiry-reminder-schedule" as const;

type RunType = "scheduled" | "now" | "test";

const isValidEmail = (value?: string | null) =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function writeScheduleHistory(input: {
  value: number;
  meta: Record<string, unknown>;
}) {
  try {
    await db.scheduleHistory.create({
      data: {
        eventName: EVENT_NAME,
        value: input.value,
        meta: input.meta,
      },
    });
  } catch (error) {
    logger.error("Failed writing app download schedule history", {
      error,
      eventName: EVENT_NAME,
    });
  }
}

export const appDownloadExpiryReminderSchedule = schedules.task({
  id: EVENT_NAME,
  cron: {
    pattern: "0 8 * * *",
    timezone: "America/New_York",
  },
  maxDuration: 120,
  queue: {
    concurrencyLimit: 1,
  },
  run: async () => {
    return runAppDownloadExpiryReminder("scheduled");
  },
});

const id: TaskName = "run-app-download-expiry-reminder-now";
export const runAppDownloadExpiryReminderNow = task({
  id,
  run: async () => {
    return runAppDownloadExpiryReminder("now");
  },
});

const testId: TaskName = "run-app-download-expiry-reminder-test";
export const runAppDownloadExpiryReminderTest = task({
  id: testId,
  run: async () => {
    return runAppDownloadExpiryReminder("test");
  },
});

async function runAppDownloadExpiryReminder(runType: RunType) {
  const defaultConfig = getTaskEventDefaultConfig(EVENT_NAME);
  const taskSettings = await getSettingAction("task-events-settings", db);
  const config = (() => {
    try {
      return getTaskEventConfigFromMeta(EVENT_NAME, taskSettings?.meta || {});
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
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "inactive",
      },
    });

    return {
      skipped: true,
      reason: "inactive",
    };
  }

  const setting = await getSettingAction("app-download-apk", db);
  const meta = ((setting.meta || {}) as Record<string, unknown>) || {};
  const downloadUrl =
    typeof meta.downloadUrl === "string" ? meta.downloadUrl.trim() : "";
  const version = typeof meta.version === "string" ? meta.version.trim() : "";
  const notes = typeof meta.notes === "string" ? meta.notes.trim() : "";
  const expiresAt =
    typeof meta.expiresAt === "string" ? new Date(meta.expiresAt) : null;
  const reminderSentForExpiry =
    typeof meta.reminderSentForExpiry === "string"
      ? meta.reminderSentForExpiry
      : null;
  const devEmail = getDevEmail();
  const now = new Date();

  if (!downloadUrl) {
    await writeScheduleHistory({
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "missing_download_url",
      },
    });

    return {
      skipped: true,
      reason: "missing_download_url",
    };
  }

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    await writeScheduleHistory({
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "missing_or_invalid_expiry",
      },
    });

    return {
      skipped: true,
      reason: "missing_or_invalid_expiry",
    };
  }

  if (!isValidEmail(devEmail)) {
    await writeScheduleHistory({
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "missing_dev_email",
      },
    });

    return {
      skipped: true,
      reason: "missing_dev_email",
    };
  }

  const recipient = devEmail as string;

  const reminderWindowStartsAt = subDays(expiresAt, 1);
  const isWithinReminderWindow = now >= reminderWindowStartsAt && now < expiresAt;
  if (runType !== "test" && !isWithinReminderWindow) {
    await writeScheduleHistory({
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "outside_reminder_window",
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      skipped: true,
      reason: "outside_reminder_window",
    };
  }

  if (runType !== "test" && reminderSentForExpiry === expiresAt.toISOString()) {
    await writeScheduleHistory({
      value: 0,
      meta: {
        triggerType: runType,
        statusUsed: config.status,
        skipped: true,
        reason: "already_sent",
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      skipped: true,
      reason: "already_sent",
    };
  }

  const { AppDownloadExpiryReminderEmail } = await import(
    "@gnd/email/emails/app-download-expiry-reminder"
  );
  const { sendEmail } = await import("../utils/resend.js");
  const downloadApiUrl = `${getAppApiUrl()}/download-app`;
  const settingsUrl = `${getAppUrl()}/settings/app-download`;

  await sendEmail({
    subject: `App download expires ${format(expiresAt, "MMM d, yyyy")}`,
    from:
      process.env.EMAIL_FROM_ADDRESS ||
      "GND Pro Desk <noreply@gndprodesk.com>",
    to: recipient,
    content: AppDownloadExpiryReminderEmail({
      expiresAt: expiresAt.toISOString(),
      version: version || null,
      downloadApiUrl,
      sourceUrl: downloadUrl,
      settingsUrl,
      notes: notes || null,
    }),
    errorLog: "App download expiry reminder email failed to send",
    successLog: "App download expiry reminder email sent",
    task: {
      id: EVENT_NAME,
      payload: {
        triggerType: runType,
        expiresAt: expiresAt.toISOString(),
        devEmail: recipient,
      },
    },
  });

  if (runType !== "test") {
    await updateSettingsMeta(
      "app-download-apk",
      {
        ...meta,
        reminderSentAt: now.toISOString(),
        reminderSentForExpiry: expiresAt.toISOString(),
      },
      db,
      "full",
    );
  }

  await writeScheduleHistory({
    value: 1,
    meta: {
      triggerType: runType,
      statusUsed: config.status,
      sent: true,
      devEmail: recipient,
      version: version || null,
      expiresAt: expiresAt.toISOString(),
      reminderWindowStartsAt: reminderWindowStartsAt.toISOString(),
    },
  });

  logger.info("App download expiry reminder completed", {
    triggerType: runType,
    devEmail: recipient,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    sent: true,
    devEmail: recipient,
    expiresAt: expiresAt.toISOString(),
    triggerType: runType,
  };
}
