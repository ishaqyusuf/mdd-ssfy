import { salesQueryParamsSchema } from "@gnd/sales/schema";
import { z } from "zod";

export const taskEventStatusSchema = z.enum(["active", "inactive"]);
export type TaskEventStatus = z.infer<typeof taskEventStatusSchema>;

const salesPendingBillReminderFilterSchema = salesQueryParamsSchema.partial();

const buildRunTaskName = (
  eventName: string,
  type: "now" | "test",
): `run-${string}-${"now" | "test"}` => {
  const normalizedEventName = eventName.replace(/-schedule$/, "");
  return `run-${normalizedEventName}-${type}`;
};

const registry = {
  "sales-pending-bill-reminder-schedule": {
    eventName: "sales-pending-bill-reminder-schedule",
    title: "Sales Pending Bill Reminder",
    description: "Send reminder emails for pending sales bills.",
    runNowTaskId: buildRunTaskName(
      "sales-pending-bill-reminder-schedule",
      "now",
    ),
    runTestTaskId: buildRunTaskName(
      "sales-pending-bill-reminder-schedule",
      "test",
    ),
    filterSchema: salesPendingBillReminderFilterSchema,
    defaultConfig: {
      status: "active" as TaskEventStatus,
      filter: {},
    },
  },
} as const;

export const taskEventRegistry = registry;
export type TaskEventName = keyof typeof taskEventRegistry;

export const taskEventNames = Object.keys(taskEventRegistry) as TaskEventName[];

export type TaskEventConfig<TFilter = Record<string, unknown>> = {
  status: TaskEventStatus;
  filter: TFilter;
};

export function isTaskEventName(value: string): value is TaskEventName {
  return value in taskEventRegistry;
}

export function getTaskEventDefinition(eventName: TaskEventName) {
  return taskEventRegistry[eventName];
}

export function getTaskEventDefaultConfig(eventName: TaskEventName) {
  return taskEventRegistry[eventName].defaultConfig;
}

export function parseTaskEventConfig(eventName: TaskEventName, input: unknown) {
  const definition = taskEventRegistry[eventName];
  const raw = ((input || {}) as Record<string, unknown>) ?? {};

  const status = taskEventStatusSchema.parse(
    raw.status ?? definition.defaultConfig.status,
  );
  const filter = definition.filterSchema.parse(
    raw.filter ?? definition.defaultConfig.filter,
  );

  return {
    status,
    filter,
  } as TaskEventConfig<typeof filter>;
}

export const taskEventsSettingsMetaSchema = z.object({
  events: z
    .record(
      z.string(),
      z.object({
        status: taskEventStatusSchema.default("active"),
        filter: z.record(z.string(), z.any()).default({}),
      }),
    )
    .default({}),
});

export type TaskEventsSettingsMeta = z.infer<typeof taskEventsSettingsMetaSchema>;

export function getTaskEventConfigFromMeta(
  eventName: TaskEventName,
  meta: unknown,
) {
  const parsedMeta = taskEventsSettingsMetaSchema.parse(meta || {});
  const current = parsedMeta.events[eventName] || {};

  return parseTaskEventConfig(eventName, current);
}

export function upsertTaskEventConfigInMeta(
  eventName: TaskEventName,
  config: TaskEventConfig,
  meta: unknown,
): TaskEventsSettingsMeta {
  const parsedMeta = taskEventsSettingsMetaSchema.parse(meta || {});

  return {
    ...parsedMeta,
    events: {
      ...parsedMeta.events,
      [eventName]: config,
    },
  };
}
