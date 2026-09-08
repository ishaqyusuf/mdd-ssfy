import { resolveSalesTaskRowOutcomes } from "@/lib/table-row-activity/sales-outcomes";
import type { TaskMonitorIntent, TaskMonitorTask } from "@/store/task-monitor";
import {
	tableRowActivity,
	rowActivityKey,
	isRowActivityBusy,
	type RowActivityToken,
} from "@/store/table-row-activity";

const runs = new Map<string, RowActivityToken[]>();
// Run identity outlives visual feedback, so persisted monitor updates cannot replay it.
const observedRuns = new Map<string, string>();
export function beginTaskRowActivity(
	ownerId: string,
	intent?: TaskMonitorIntent,
	startedAt?: number,
) {
	if (!ownerId || !intent || !("salesIds" in intent.args)) return [];
	if (
		startedAt === undefined &&
		isRowActivityBusy(ownerId, "sales-orders", intent.args.salesIds)
	)
		throw new Error("An action is already running for this row.");
	const ids = intent.args.salesIds.filter((entityId) => {
		const existing = tableRowActivity
			.getSnapshot()
			.get(rowActivityKey({ ownerId, tableId: "sales-orders", entityId }));
		return (
			startedAt === undefined || !existing || existing.startedAt < startedAt
		);
	});
	return ids.map((entityId) =>
		tableRowActivity.begin({
			ownerId,
			startedAt,
			tableId: "sales-orders",
			entityId,
			label:
				intent.name === "sales.mark-as-fulfilled"
					? "Fulfilling"
					: "Updating production",
		}),
	);
}
export function bindTaskRowActivity(runId: string, tokens: RowActivityToken[]) {
	if (tokens.length) {
		observedRuns.set(runId, tokens[0]!.ownerId);
		runs.set(runId, tokens);
	}
}
export function failTaskRowActivity(tokens: readonly RowActivityToken[]) {
	for (const token of tokens)
		tableRowActivity.settle(token, {
			phase: "error",
			label: "Unable to start action",
		});
}
export function settleTaskRowActivity(
	task: Pick<TaskMonitorTask, "runId">,
	phase: "success" | "error" | "canceled",
	output: unknown,
) {
	const tokens = runs.get(task.runId);
	if (!tokens) return;
	runs.delete(task.runId);
	const outcomes = resolveSalesTaskRowOutcomes(
		tokens.map((token) => token.entityId),
		output,
	);
	for (const token of tokens) {
		tableRowActivity.settle(
			token,
			phase === "success"
				? outcomes.find((outcome) => outcome.entityId === token.entityId)!
				: {
						phase: phase === "error" ? "error" : "canceled",
						label: phase === "error" ? "Action failed" : "Canceled",
					},
		);
	}
}

export function restoreTaskRowActivity(task: TaskMonitorTask) {
	if (
		task.status !== "SYNCING" ||
		observedRuns.has(task.runId) ||
		!task.ownerId
	)
		return;
	observedRuns.set(task.runId, task.ownerId);
	bindTaskRowActivity(
		task.runId,
		beginTaskRowActivity(task.ownerId, task.intent, task.createdAt),
	);
}

export function clearOtherRowActivityOwners(ownerId: string | null) {
	for (const [runId, owner] of observedRuns)
		if (owner !== ownerId) observedRuns.delete(runId);
	for (const [runId, tokens] of runs) {
		if (tokens.some((token) => token.ownerId !== ownerId)) runs.delete(runId);
	}
	const owners = new Set(
		[...tableRowActivity.getSnapshot().values()].map(
			(activity) => activity.ownerId,
		),
	);
	for (const owner of owners)
		if (owner !== ownerId) tableRowActivity.clearOwner(owner);
}
