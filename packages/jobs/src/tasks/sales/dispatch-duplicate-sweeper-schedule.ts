import { db } from "@gnd/db";
import { getSettingAction } from "@gnd/settings";
import type { TaskName } from "@jobs/schema";
import {
  getTaskEventConfigFromMeta,
  getTaskEventDefaultConfig,
} from "@jobs/task-events/registry";
import { logger, schedules, task } from "@trigger.dev/sdk/v3";

const EVENT_NAME = "dispatch-duplicate-sweeper-schedule" as const;

type RunType = "scheduled" | "now" | "test";

type DispatchRow = {
  id: number;
  salesOrderId: number;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  itemCount: number;
  packedItemCount: number;
};

type DuplicateDispatchGroup = {
  salesId: number;
  dispatches: DispatchRow[];
};

function dispatchKeepScore(dispatch: DispatchRow) {
  const statusRank =
    dispatch.status === "completed"
      ? 4
      : dispatch.status === "in progress"
        ? 3
        : dispatch.status === "queue"
          ? 2
          : dispatch.status === "missing items"
            ? 1
            : 0;

  return (
    statusRank * 1_000_000 +
    Math.min(999_999, dispatch.packedItemCount * 10_000 + dispatch.itemCount)
  );
}

function pickDispatchToKeep(dispatches: DispatchRow[]) {
  return dispatches
    .slice()
    .sort((a, b) => {
      const scoreDiff = dispatchKeepScore(b) - dispatchKeepScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const updatedDiff =
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      if (updatedDiff !== 0) return updatedDiff;

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })[0];
}

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

async function getDuplicateDispatchGroups() {
  const dispatches = await db.orderDelivery.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ salesOrderId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      salesOrderId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          packingStatus: true,
        },
      },
    },
  });

  const bySalesId = new Map<number, DuplicateDispatchGroup>();

  for (const dispatch of dispatches) {
    const itemCount = dispatch.items.length;
    const packedItemCount = dispatch.items.filter(
      (item) => item.packingStatus === "packed",
    ).length;

    const next: DispatchRow = {
      id: dispatch.id,
      salesOrderId: dispatch.salesOrderId,
      status: dispatch.status,
      createdAt: dispatch.createdAt,
      updatedAt: dispatch.updatedAt,
      itemCount,
      packedItemCount,
    };

    const existing = bySalesId.get(dispatch.salesOrderId);
    if (existing) {
      existing.dispatches.push(next);
      continue;
    }

    bySalesId.set(dispatch.salesOrderId, {
      salesId: dispatch.salesOrderId,
      dispatches: [next],
    });
  }

  return [...bySalesId.values()].filter((group) => group.dispatches.length > 1);
}

async function resolveDuplicateDispatchGroups(
  groups: DuplicateDispatchGroup[],
  runType: RunType,
) {
  const dryRun = runType === "test";
  let cleanedSalesCount = 0;
  let deletedDispatchCount = 0;
  const breakdown: Array<{
    salesId: number;
    keepDispatchId: number;
    deleteDispatchIds: number[];
    deletedCount: number;
  }> = [];

  for (const group of groups) {
    const keep = pickDispatchToKeep(group.dispatches);
    if (!keep) continue;

    const deleteDispatchIds = group.dispatches
      .map((dispatch) => dispatch.id)
      .filter((id) => id !== keep.id);

    if (!deleteDispatchIds.length) continue;

    let deletedCount = deleteDispatchIds.length;

    if (!dryRun) {
      const result = await db.orderDelivery.updateMany({
        where: {
          salesOrderId: group.salesId,
          id: {
            in: deleteDispatchIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      deletedCount = result.count;
    }

    if (deletedCount > 0) {
      cleanedSalesCount += 1;
      deletedDispatchCount += deletedCount;
    }

    if (breakdown.length < 100) {
      breakdown.push({
        salesId: group.salesId,
        keepDispatchId: keep.id,
        deleteDispatchIds,
        deletedCount,
      });
    }
  }

  return {
    dryRun,
    cleanedSalesCount,
    deletedDispatchCount,
    breakdown,
  };
}

async function runDuplicateDispatchSweeper(runType: RunType) {
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
        skipped: true,
        reason: "inactive",
      },
    });

    logger.info("Dispatch duplicate sweeper skipped (inactive schedule).");
    return {
      scannedGroups: 0,
      cleanedSalesCount: 0,
      deletedDispatchCount: 0,
      skipped: true,
    };
  }

  const groups = await getDuplicateDispatchGroups();
  const result = await resolveDuplicateDispatchGroups(groups, runType);

  await writeScheduleHistory({
    eventName: EVENT_NAME,
    value: result.deletedDispatchCount,
    meta: {
      triggerType: runType,
      statusUsed: config.status,
      scannedGroups: groups.length,
      cleanedSalesCount: result.cleanedSalesCount,
      deletedDispatchCount: result.deletedDispatchCount,
      dryRun: result.dryRun,
      breakdown: result.breakdown,
    },
  });

  logger.info("Dispatch duplicate sweeper completed", {
    triggerType: runType,
    scannedGroups: groups.length,
    cleanedSalesCount: result.cleanedSalesCount,
    deletedDispatchCount: result.deletedDispatchCount,
    dryRun: result.dryRun,
  });

  return {
    scannedGroups: groups.length,
    cleanedSalesCount: result.cleanedSalesCount,
    deletedDispatchCount: result.deletedDispatchCount,
    dryRun: result.dryRun,
  };
}

export const dispatchDuplicateSweeperSchedule = schedules.task({
  id: EVENT_NAME,
  cron: {
    pattern: "0 3 * * *",
    timezone: "America/New_York",
  },
  maxDuration: 300,
  queue: {
    concurrencyLimit: 1,
  },
  run: async () => {
    return runDuplicateDispatchSweeper("scheduled");
  },
});

const runNowId: TaskName = "run-dispatch-duplicate-sweeper-now";
export const runDispatchDuplicateSweeperNow = task({
  id: runNowId,
  run: async () => {
    return runDuplicateDispatchSweeper("now");
  },
});

const runTestId: TaskName = "run-dispatch-duplicate-sweeper-test";
export const runDispatchDuplicateSweeperTest = task({
  id: runTestId,
  run: async () => {
    return runDuplicateDispatchSweeper("test");
  },
});
