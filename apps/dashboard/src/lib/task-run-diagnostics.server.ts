import "server-only";

import { getServerAuthSession } from "@/lib/auth/session";
import {
	finalizeTaskRunDiagnosticWithRetriever,
	recordTaskRunStartFailure,
	registerTaskRunDiagnostic,
} from "@gnd/api/db/queries/task-run-diagnostics";
import { db } from "@gnd/db";
import { runs } from "@trigger.dev/sdk/v3";

type TaskDiagnosticMetadata = {
	taskName?: string | null;
	type?: string | null;
	entityId?: string | number | null;
	entityLabel?: string | null;
};

type TriggerTaskEvent = {
	id?: string | null;
};

type TaskDiagnosticContext = {
	db: typeof db;
	userId: number;
};

export async function logTriggeredTaskRun(input: {
	taskName: string;
	payload?: unknown;
	event: TriggerTaskEvent | null | undefined;
}) {
	const runId = input.event?.id;
	if (!runId) return;

	const ctx = await getTaskDiagnosticContext();
	if (!ctx) return;

	const metadata = getTaskDiagnosticMetadata(input.taskName, input.payload);

	await swallowDiagnosticError("Unable to record task run start", async () => {
		await registerTaskRunDiagnostic(ctx, {
			runId,
			taskName: input.taskName,
			title: getTaskNameLabel(input.taskName),
			description: getTaskDescription(input.taskName, metadata),
			source: "trigger-task-action",
			environment: process.env.NODE_ENV,
			metadata,
		});
	});
}

export async function logTaskRunStartFailure(input: {
	taskName: string;
	payload?: unknown;
	error: unknown;
}) {
	const ctx = await getTaskDiagnosticContext();
	if (!ctx) return;

	const metadata = getTaskDiagnosticMetadata(input.taskName, input.payload);

	await swallowDiagnosticError(
		"Unable to record task run start failure",
		async () => {
			await recordTaskRunStartFailure(ctx, {
				taskName: input.taskName,
				title: getTaskNameLabel(input.taskName),
				description: getTaskDescription(input.taskName, metadata),
				source: "trigger-task-action",
				environment: process.env.NODE_ENV,
				errorMessage: getErrorMessage(input.error),
				errorName: getErrorName(input.error),
				metadata,
			});
		},
	);
}

export async function finalizeTaskRunDiagnostic(input: {
	runId: string;
	observedStatus?: "COMPLETED" | "FAILED" | "CANCELED";
	errorMessage?: string;
	metadata?: TaskDiagnosticMetadata;
	finishedAt?: Date;
}) {
	const ctx = await getTaskDiagnosticContext();
	if (!ctx) return null;

	return swallowDiagnosticError("Unable to finalize task run diagnostic", () =>
		finalizeTaskRunDiagnosticWithRetriever(ctx, input, (runId) =>
			runs.retrieve(runId),
		),
	);
}

async function getTaskDiagnosticContext(): Promise<TaskDiagnosticContext | null> {
	const session = await getServerAuthSession();
	const userId = parseUserId(session?.user?.id);

	if (!userId) return null;

	return {
		db,
		userId,
	};
}

async function swallowDiagnosticError<T>(
	message: string,
	fn: () => Promise<T>,
) {
	try {
		return await fn();
	} catch (error) {
		console.error(message, {
			error,
		});
		return null;
	}
}

function getTaskDiagnosticMetadata(
	taskName: string,
	payload?: unknown,
): TaskDiagnosticMetadata {
	const data =
		payload && typeof payload === "object"
			? (payload as Record<string, unknown>)
			: {};
	const meta =
		data.meta && typeof data.meta === "object"
			? (data.meta as Record<string, unknown>)
			: {};
	const salesId = meta.salesId ?? data.salesId ?? data.salesOrderId;
	const salesIds = Array.isArray(data.salesIds)
		? data.salesIds
		: Array.isArray(data.ids)
			? data.ids
			: null;
	const nestedPayload =
		data.payload && typeof data.payload === "object"
			? (data.payload as Record<string, unknown>)
			: {};
	const dispatchId =
		data.dispatchId ??
		nestedObjectValue(data.packItems, "dispatchId") ??
		nestedObjectValue(data.clearPackings, "dispatchId") ??
		nestedObjectValue(data.submitDispatch, "dispatchId");

	if (taskName === "send-sales-email") {
		return {
			taskName,
			type: "sales-email",
			entityId: salesIds?.[0] ?? salesId ?? null,
			entityLabel: salesIds?.length
				? `${salesIds.length} sale${salesIds.length === 1 ? "" : "s"}`
				: salesId
					? `sale #${salesId}`
					: null,
		};
	}

	if (taskName === "send-sales-reminder") {
		return {
			taskName,
			type: "sales-reminder",
			entityId: salesIds?.[0] ?? null,
			entityLabel: salesIds?.length
				? `${salesIds.length} reminder${salesIds.length === 1 ? "" : "s"}`
				: null,
		};
	}

	if (taskName === "notification") {
		if (
			data.channel === "simple_sales_document_email" ||
			data.channel === "composed_sales_document_email"
		) {
			const nestedSalesIds = Array.isArray(nestedPayload.salesIds)
				? nestedPayload.salesIds
				: null;
			return {
				taskName,
				type: "sales-email",
				entityId: nestedSalesIds?.[0] ?? null,
				entityLabel: nestedSalesIds?.length
					? `${nestedSalesIds.length} sale${
							nestedSalesIds.length === 1 ? "" : "s"
						}`
					: String(data.channel).replaceAll("_", " "),
			};
		}

		return {
			taskName,
			type: "notification",
			entityId: toEntityId(nestedPayload.dispatchId ?? nestedPayload.salesId),
			entityLabel: data.channel
				? String(data.channel).replaceAll("_", " ")
				: null,
		};
	}

	return {
		taskName,
		type: taskName,
		entityId: toEntityId(salesId ?? dispatchId),
		entityLabel: salesId
			? `sale #${salesId}`
			: dispatchId
				? `dispatch #${dispatchId}`
				: null,
	};
}

function getTaskDescription(
	taskName: string,
	metadata: TaskDiagnosticMetadata,
) {
	if (metadata.entityLabel) return metadata.entityLabel;

	switch (taskName) {
		case "send-sales-email":
			return "Sales email background task";
		case "send-sales-reminder":
			return "Sales reminder background task";
		case "notification":
			return "Notification background task";
		default:
			return "Background task";
	}
}

function getTaskNameLabel(taskName: string) {
	switch (taskName) {
		case "send-sales-email":
			return "Sending sales email";
		case "send-sales-reminder":
			return "Sending reminder email";
		case "send-composed-email":
			return "Sending email";
		case "notification":
			return "Sending notification";
		case "update-sales-control":
			return "Updating sales control";
		case "reset-sales-control":
			return "Resetting sales control";
		case "create-sales-history":
			return "Recording sales history";
		case "create-sales-dispatch":
			return "Creating dispatch";
		case "warm-sales-document-snapshot":
			return "Preparing sales document";
		case "sync-sales-inventory-line-items":
			return "Syncing sales inventory";
		case "attach-signed-dispatch-pdf":
			return "Attaching signed dispatch PDF";
		case "run-inventory-full-import-now":
			return "Running inventory import";
		default:
			return "Running background task";
	}
}

function nestedObjectValue(value: unknown, key: string) {
	if (!value || typeof value !== "object") return undefined;
	return (value as Record<string, unknown>)[key];
}

function toEntityId(value: unknown) {
	if (typeof value === "string" || typeof value === "number") return value;
	return null;
}

function parseUserId(userId: unknown) {
	if (typeof userId === "number") {
		return Number.isFinite(userId) ? userId : null;
	}

	if (typeof userId === "string") {
		const parsed = Number(userId);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message?: unknown }).message || "");
	}
	return "Unable to start the background task.";
}

function getErrorName(error: unknown) {
	if (error instanceof Error) return error.name;
	if (!error || typeof error !== "object") return undefined;
	const name = (error as { name?: unknown }).name;
	return typeof name === "string" ? name : undefined;
}
