import { db } from "@gnd/db";
import { createSalesRequestMailboxSchedulerStore } from "@gnd/db/queries";
import { schedules, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { createConfiguredSalesRequestMailboxJobRuntime } from "./composition";
import {
	mailboxDisconnectJobPayloadSchema,
	mailboxMessageDetailJobPayloadSchema,
	mailboxRetentionJobPayloadSchema,
	mailboxSyncJobPayloadSchema,
	mailboxTokenHealthJobPayloadSchema,
} from "./runtime";
import { createSalesRequestMailboxSweep } from "./sweep";

export const SALES_REQUEST_MAILBOX_TASK_IDS = {
	sync: "sales-request-mailbox-sync",
	detail: "sales-request-mailbox-detail",
	tokenHealth: "sales-request-mailbox-token-health",
	disconnect: "sales-request-mailbox-disconnect",
	retention: "sales-request-mailbox-retention",
	sweep: "sales-request-mailbox-sweep",
} as const;

function runtime() {
	return createConfiguredSalesRequestMailboxJobRuntime({
		db,
		environment: process.env,
		fetch: globalThis.fetch,
	});
}

export const salesRequestMailboxSyncTask = schemaTask({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.sync,
	schema: mailboxSyncJobPayloadSchema,
	queue: { concurrencyLimit: 4 },
	maxDuration: 60,
	retry: { maxAttempts: 3 },
	run: (payload, { ctx }) => runtime().sync(payload, { runId: ctx.run.id }),
});

export const salesRequestMailboxDetailTask = schemaTask({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.detail,
	schema: mailboxMessageDetailJobPayloadSchema,
	queue: { concurrencyLimit: 4 },
	maxDuration: 60,
	retry: { maxAttempts: 3 },
	run: (payload, { ctx }) => runtime().detail(payload, { runId: ctx.run.id }),
});

export const salesRequestMailboxTokenHealthTask = schemaTask({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.tokenHealth,
	schema: mailboxTokenHealthJobPayloadSchema,
	queue: { concurrencyLimit: 2 },
	maxDuration: 60,
	retry: { maxAttempts: 2 },
	run: (payload, { ctx }) =>
		runtime().tokenHealth(payload, { runId: ctx.run.id }),
});

export const salesRequestMailboxDisconnectTask = schemaTask({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.disconnect,
	schema: mailboxDisconnectJobPayloadSchema,
	queue: { concurrencyLimit: 2 },
	maxDuration: 60,
	retry: { maxAttempts: 3 },
	run: (payload, { ctx }) =>
		runtime().disconnect(payload, { runId: ctx.run.id }),
});

export const salesRequestMailboxRetentionTask = schemaTask({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.retention,
	schema: mailboxRetentionJobPayloadSchema,
	queue: { concurrencyLimit: 1 },
	maxDuration: 60,
	retry: { maxAttempts: 3 },
	run: async (payload, { ctx }) => {
		const result = await runtime().retention(payload, { runId: ctx.run.id });
		if ("hasMore" in result && result.hasMore) {
			await tasks.trigger(
				SALES_REQUEST_MAILBOX_TASK_IDS.retention,
				{},
				{
					idempotencyKey: `sales-request-mailbox-retention:continue:${ctx.run.id}`,
					idempotencyKeyTTL: "24h",
				},
			);
		}
		return result;
	},
});

export const salesRequestMailboxSweep = schedules.task({
	id: SALES_REQUEST_MAILBOX_TASK_IDS.sweep,
	cron: {
		pattern: "*/5 * * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	queue: { concurrencyLimit: 1 },
	maxDuration: 60,
	retry: { maxAttempts: 1 },
	run: () =>
		createSalesRequestMailboxSweep({
			findDueWork: createSalesRequestMailboxSchedulerStore(db).findDueWork,
			dispatch: async ({ kind, payload, idempotencyKey }) => {
				const taskId =
					kind === "token-health"
						? SALES_REQUEST_MAILBOX_TASK_IDS.tokenHealth
						: SALES_REQUEST_MAILBOX_TASK_IDS[kind];
				await tasks.trigger(taskId, payload, {
					idempotencyKey,
					idempotencyKeyTTL: "10m",
				});
			},
		})(),
});

export const salesRequestMailboxRetentionSchedule = schedules.task({
	id: "sales-request-mailbox-retention-schedule",
	cron: {
		pattern: "43 2 * * *",
		timezone: "UTC",
		environments: ["PRODUCTION"],
	},
	queue: { concurrencyLimit: 1 },
	maxDuration: 60,
	retry: { maxAttempts: 1 },
	run: async () => {
		await tasks.trigger(
			SALES_REQUEST_MAILBOX_TASK_IDS.retention,
			{},
			{
				idempotencyKey: `sales-request-mailbox-retention:${new Date()
					.toISOString()
					.slice(0, 10)}`,
				idempotencyKeyTTL: "24h",
			},
		);
	},
});
