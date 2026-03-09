import type { TRPCContext } from "@api/trpc/init";
import {
  getTaskEventConfigFromMeta,
  getTaskEventDefinition,
  isTaskEventName,
  parseTaskEventConfig,
  taskEventNames,
  upsertTaskEventConfigInMeta,
} from "@gnd/jobs/task-events/registry";
import { getSettingAction, updateSettingsMeta } from "@gnd/settings";
import { runs, tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";

type EnsureTaskEventName = string;

async function requireSuperAdmin(ctx: TRPCContext) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const user = await ctx.db.users.findFirst({
    where: {
      id: ctx.userId,
    },
    select: {
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const role = user?.roles?.[0]?.role?.name;
  if (role?.toLowerCase() !== "super admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Super Admin can access task events.",
    });
  }
}

function resolveEventNameOrThrow(eventName: EnsureTaskEventName) {
  if (!isTaskEventName(eventName)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown task event: ${eventName}`,
    });
  }

  return eventName;
}

export async function getTaskEvents(ctx: TRPCContext) {
  await requireSuperAdmin(ctx);

  const setting = await getSettingAction("task-events-settings", ctx.db);

  const events = await Promise.all(
    taskEventNames.map(async (eventName) => {
      const definition = getTaskEventDefinition(eventName);
      const config = getTaskEventConfigFromMeta(eventName, setting.meta || {});

      const latestHistory = await ctx.db.scheduleHistory.findFirst({
        where: {
          eventName,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        eventName,
        title: definition.title,
        description: definition.description,
        runNowTaskId: definition.runNowTaskId,
        runTestTaskId: definition.runTestTaskId,
        config,
        latestHistory,
      };
    }),
  );

  return {
    events,
  };
}

export async function getTaskEvent(ctx: TRPCContext, eventName: string) {
  await requireSuperAdmin(ctx);

  const name = resolveEventNameOrThrow(eventName);
  const setting = await getSettingAction("task-events-settings", ctx.db);

  const definition = getTaskEventDefinition(name);
  const config = getTaskEventConfigFromMeta(name, setting.meta || {});

  return {
    eventName: name,
    title: definition.title,
    description: definition.description,
    runNowTaskId: definition.runNowTaskId,
    runTestTaskId: definition.runTestTaskId,
    config,
  };
}

export async function updateTaskEvent(
  ctx: TRPCContext,
  input: {
    eventName: string;
    status?: "active" | "inactive";
    filter?: Record<string, unknown>;
  },
) {
  await requireSuperAdmin(ctx);

  const eventName = resolveEventNameOrThrow(input.eventName);
  const setting = await getSettingAction("task-events-settings", ctx.db);
  const current = getTaskEventConfigFromMeta(eventName, setting.meta || {});

  const nextConfig = parseTaskEventConfig(eventName, {
    status: input.status ?? current.status,
    filter: input.filter ?? current.filter,
  });

  const nextMeta = upsertTaskEventConfigInMeta(
    eventName,
    nextConfig,
    setting.meta || {},
  );

  await updateSettingsMeta("task-events-settings", nextMeta, ctx.db, "full");

  return {
    eventName,
    config: nextConfig,
  };
}

export async function getTaskEventHistory(
  ctx: TRPCContext,
  input: {
    eventName: string;
    page?: number;
    size?: number;
  },
) {
  await requireSuperAdmin(ctx);

  const eventName = resolveEventNameOrThrow(input.eventName);
  const page = Math.max(1, input.page || 1);
  const size = Math.min(100, Math.max(1, input.size || 20));

  const [list, total] = await Promise.all([
    ctx.db.scheduleHistory.findMany({
      where: {
        eventName,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: size,
      skip: (page - 1) * size,
    }),
    ctx.db.scheduleHistory.count({
      where: {
        eventName,
      },
    }),
  ]);

  return {
    list,
    total,
    page,
    size,
  };
}

export async function runTaskEventNow(
  ctx: TRPCContext,
  input: {
    eventName: string;
  },
) {
  await requireSuperAdmin(ctx);

  const eventName = resolveEventNameOrThrow(input.eventName);
  const definition = getTaskEventDefinition(eventName);

  return tasks.trigger(definition.runNowTaskId, {
    eventName,
  });
}

export async function runTaskEventTest(
  ctx: TRPCContext,
  input: {
    eventName: string;
  },
) {
  await requireSuperAdmin(ctx);

  const eventName = resolveEventNameOrThrow(input.eventName);
  const definition = getTaskEventDefinition(eventName);

  return tasks.trigger(definition.runTestTaskId, {
    eventName,
  });
}

export async function getTaskEventRunStatus(
  ctx: TRPCContext,
  input: {
    runId: string;
  },
) {
  await requireSuperAdmin(ctx);

  const run = await runs.retrieve(input.runId);

  return {
    id: run.id,
    taskIdentifier: run.taskIdentifier,
    status: run.status,
    attemptCount: run.attemptCount,
    isQueued: run.isQueued,
    isExecuting: run.isExecuting,
    isCompleted: run.isCompleted,
    isSuccess: run.isSuccess,
    isFailed: run.isFailed,
    isCancelled: run.isCancelled,
    createdAt: run.createdAt,
    startedAt: run.startedAt ?? null,
    updatedAt: run.updatedAt,
    finishedAt: run.finishedAt ?? null,
    output: run.output ?? null,
    error: run.error ?? null,
  };
}
