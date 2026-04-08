import { dedupeUnitInvoiceTasks } from "@community/utils/unit-invoice-tasks";
import { db } from "@gnd/db";
import { getSettingAction, updateSettingsMeta } from "@gnd/settings";
import type { TaskName } from "../../schema";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const EVENT_NAME = "unit-invoice-duplicate-sweeper" as const;

const runSchema = z.object({
  homeId: z.number().optional().nullable(),
  reason: z.string().optional().nullable(),
});

type BuilderTaskRow = {
  id: number;
  taskUid: string;
  taskName: string;
};

function normalizeTaskName(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function parseSweepDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
    logger.error("Failed writing unit invoice sweeper history", { error });
  }
}

async function getBuilderTasks(builderId: number, cache: Map<number, BuilderTaskRow[]>) {
  if (cache.has(builderId)) {
    return cache.get(builderId)!;
  }

  const rows = await db.builderTask.findMany({
    where: {
      builderId,
      deletedAt: null,
    },
    select: {
      id: true,
      taskUid: true,
      taskName: true,
    },
  });

  cache.set(builderId, rows);
  return rows;
}

function resolveBuilderTaskId(input: {
  keptTask: {
    taskUid?: string | null;
    taskName?: string | null;
    builderTaskId?: number | null;
  };
  duplicates: Array<{
    taskUid?: string | null;
    taskName?: string | null;
    builderTaskId?: number | null;
  }>;
  builderTasks: BuilderTaskRow[];
}) {
  const duplicateMatch = input.duplicates.find((task) => task.builderTaskId)?.builderTaskId;
  if (duplicateMatch) return duplicateMatch;

  const taskUids = [
    input.keptTask.taskUid,
    ...input.duplicates.map((task) => task.taskUid),
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  for (const taskUid of taskUids) {
    const uidMatch = input.builderTasks.find((task) => task.taskUid === taskUid);
    if (uidMatch) return uidMatch.id;
  }

  const taskNames = [
    normalizeTaskName(input.keptTask.taskName),
    ...input.duplicates.map((task) => normalizeTaskName(task.taskName)),
  ].filter(Boolean) as string[];

  for (const taskName of taskNames) {
    const nameMatch = input.builderTasks.find(
      (task) => normalizeTaskName(task.taskName) === taskName,
    );
    if (nameMatch) return nameMatch.id;
  }

  return null;
}

async function getCandidateHomeIds(input: {
  homeId?: number | null;
  lastCompletedAt?: Date | null;
}) {
  const ids = new Set<number>();

  if (input.homeId) {
    ids.add(input.homeId);
  }

  const changedWhere = input.lastCompletedAt
    ? {
        OR: [
          {
            createdAt: {
              gt: input.lastCompletedAt,
            },
          },
          {
            tasks: {
              some: {
                deletedAt: null,
                OR: [
                  {
                    createdAt: {
                      gt: input.lastCompletedAt,
                    },
                  },
                  {
                    updatedAt: {
                      gt: input.lastCompletedAt,
                    },
                  },
                ],
              },
            },
          },
        ],
      }
    : {
        tasks: {
          some: {
            deletedAt: null,
          },
        },
      };

  const rows = await db.homes.findMany({
    where: {
      deletedAt: null,
      ...(input.homeId
        ? {
            id: {
              not: input.homeId,
            },
          }
        : {}),
      ...changedWhere,
    },
    select: {
      id: true,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  for (const row of rows) {
    ids.add(row.id);
  }

  return Array.from(ids);
}

async function runUnitInvoiceDuplicateSweeper(input: z.infer<typeof runSchema>) {
  const settings = await getSettingAction("unit-invoice-sweeper-settings", db);
  const sweepMeta = settings.meta || {};
  const lastCompletedAt = parseSweepDate(sweepMeta?.lastCompletedAt || null);
  const startedAt = new Date();

  await updateSettingsMeta(
    "unit-invoice-sweeper-settings",
    {
      ...(sweepMeta || {}),
      running: true,
      lastStartedAt: startedAt.toISOString(),
    } as any,
    db,
    "partial",
  );

  try {
    const homeIds = await getCandidateHomeIds({
      homeId: input.homeId || null,
      lastCompletedAt,
    });

    if (!homeIds.length) {
      const completedAt = new Date();
      await updateSettingsMeta(
        "unit-invoice-sweeper-settings",
        {
          ...(sweepMeta || {}),
          running: false,
          lastStartedAt: startedAt.toISOString(),
          lastCompletedAt: completedAt.toISOString(),
          lastRunSummary: {
            homeId: input.homeId || null,
            reason: input.reason || "invoice-open",
            scannedUnits: 0,
            cleanedUnits: 0,
            deletedTaskCount: 0,
            updatedBuilderTaskCount: 0,
            skippedPaidDuplicateGroups: 0,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
          },
        } as any,
        db,
        "partial",
      );

      return {
        scannedUnits: 0,
        cleanedUnits: 0,
        deletedTaskCount: 0,
        updatedBuilderTaskCount: 0,
      };
    }

    const homes = await db.homes.findMany({
      where: {
        id: {
          in: homeIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        project: {
          select: {
            builderId: true,
          },
        },
        tasks: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            id: true,
            taskUid: true,
            taskName: true,
            builderTaskId: true,
            amountPaid: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const builderTaskCache = new Map<number, BuilderTaskRow[]>();
    let cleanedUnits = 0;
    let deletedTaskCount = 0;
    let updatedBuilderTaskCount = 0;
    let skippedPaidDuplicateGroups = 0;

    for (const home of homes) {
      const { groups } = dedupeUnitInvoiceTasks(home.tasks);

      const duplicateTaskIdsToDelete: number[] = [];
      const updates: Array<{ id: number; builderTaskId: number }> = [];
      const builderId = home.project?.builderId || null;
      const builderTasks =
        builderId ? await getBuilderTasks(builderId, builderTaskCache) : [];

      for (const group of groups) {
        if (!group.duplicates.length) continue;

        const hasRecordedPayment = [group.kept, ...group.duplicates].some(
          (task) => Number(task.amountPaid || 0) !== 0,
        );

        if (hasRecordedPayment) {
          skippedPaidDuplicateGroups += 1;
          continue;
        }

        duplicateTaskIdsToDelete.push(...group.duplicates.map((task) => task.id));
        if (group.kept.builderTaskId) continue;

        const builderTaskId = resolveBuilderTaskId({
          keptTask: group.kept,
          duplicates: group.duplicates,
          builderTasks,
        });

        if (builderTaskId) {
          updates.push({
            id: group.kept.id,
            builderTaskId,
          });
        }
      }

      if (!duplicateTaskIdsToDelete.length && !updates.length) continue;

      await db.$transaction(async (tx) => {
        if (updates.length) {
          await Promise.all(
            updates.map((update) =>
              tx.homeTasks.update({
                where: {
                  id: update.id,
                },
                data: {
                  builderTaskId: update.builderTaskId,
                },
              }),
            ),
          );
        }

        if (duplicateTaskIdsToDelete.length) {
          await tx.homeTasks.deleteMany({
            where: {
              id: {
                in: duplicateTaskIdsToDelete,
              },
            },
          });
        }
      });

      if (duplicateTaskIdsToDelete.length) {
        cleanedUnits += 1;
      }
      deletedTaskCount += duplicateTaskIdsToDelete.length;
      updatedBuilderTaskCount += updates.length;
    }

    const completedAt = new Date();
    const summary = {
      homeId: input.homeId || null,
      reason: input.reason || "invoice-open",
      scannedUnits: homes.length,
      cleanedUnits,
      deletedTaskCount,
      updatedBuilderTaskCount,
      skippedPaidDuplicateGroups,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
    };

    await updateSettingsMeta(
      "unit-invoice-sweeper-settings",
      {
        ...(sweepMeta || {}),
        running: false,
        lastStartedAt: startedAt.toISOString(),
        lastCompletedAt: completedAt.toISOString(),
        lastRunSummary: summary,
      } as any,
      db,
      "partial",
    );

    await writeScheduleHistory({
      value: deletedTaskCount,
      meta: summary,
    });

    logger.info("Unit invoice duplicate sweeper completed", summary);

    return summary;
  } catch (error) {
    await updateSettingsMeta(
      "unit-invoice-sweeper-settings",
      {
        ...(sweepMeta || {}),
        running: false,
        lastStartedAt: startedAt.toISOString(),
        lastRunSummary: {
          homeId: input.homeId || null,
          reason: input.reason || "invoice-open",
          scannedUnits: 0,
          cleanedUnits: 0,
          deletedTaskCount: 0,
          updatedBuilderTaskCount: 0,
          skippedPaidDuplicateGroups: 0,
          startedAt: startedAt.toISOString(),
          completedAt: null,
        },
      } as any,
      db,
      "partial",
    );

    logger.error("Unit invoice duplicate sweeper failed", {
      error,
      homeId: input.homeId || null,
    });

    throw error;
  }
}

const runNowId: TaskName = "run-unit-invoice-duplicate-sweeper-now";
export const runUnitInvoiceDuplicateSweeperNow = schemaTask({
  id: runNowId,
  schema: runSchema,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload) => {
    return runUnitInvoiceDuplicateSweeper(payload);
  },
});
