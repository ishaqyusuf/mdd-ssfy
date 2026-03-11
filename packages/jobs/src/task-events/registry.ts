import { salesQueryParamsSchema } from "@gnd/sales/schema";
import { z } from "zod";

export const taskEventStatusSchema = z.enum(["active", "inactive"]);
export type TaskEventStatus = z.infer<typeof taskEventStatusSchema>;

const salesPendingBillReminderFilterSchema = salesQueryParamsSchema.partial();

type TaskEventFilterDefinition = {
	key: string;
	label: string;
	type: "input" | "checkbox" | "date" | "date-range";
	description?: string;
};

type TaskEventFilterSystem = {
	systemId: string;
	paramsSchemaId: string;
	trpcRoute: string;
	definitions: TaskEventFilterDefinition[];
};

const salesReminderFilterDefinitions: TaskEventFilterDefinition[] = [
	{ key: "q", label: "Search", type: "input" },
	{ key: "customer.name", label: "Customer", type: "input" },
	{ key: "phone", label: "Phone", type: "input" },
	{ key: "po", label: "PO", type: "input" },
	{ key: "sales.rep", label: "Sales Rep", type: "input" },
	{ key: "orderNo", label: "Order No", type: "input" },
	{
		key: "production.assignment",
		label: "Production Assignment",
		type: "input",
	},
	{ key: "production.status", label: "Production Status", type: "input" },
	{ key: "dispatch.status", label: "Dispatch Status", type: "input" },
	{ key: "production", label: "Production", type: "input" },
	{ key: "invoice", label: "Invoice", type: "input" },
	{ key: "dateRange", label: "Date Range", type: "date-range" },
	{ key: "showing", label: "Showing", type: "input" },
];

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
		filterSystem: {
			systemId: "sales-order-search-filter",
			paramsSchemaId: "use-sales-filter-params",
			trpcRoute: "filters.salesOrders",
			definitions: salesReminderFilterDefinitions,
		} as TaskEventFilterSystem,
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

export type TaskEventsSettingsMeta = z.infer<
	typeof taskEventsSettingsMetaSchema
>;

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
