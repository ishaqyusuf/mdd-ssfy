import { expect, it } from "bun:test";
import { tableRowActivity } from "@/store/table-row-activity";
import type { TaskMonitorTask } from "@/store/task-monitor";
import {
	beginTaskRowActivity,
	bindTaskRowActivity,
	settleTaskRowActivity,
} from "./sales-task";

it("keeps per-sale review and failure outcomes when the job transport succeeds", () => {
	const task: TaskMonitorTask = {
		id: "run",
		runId: "run",
		accessToken: "test",
		ownerId: "task-test",
		status: "SYNCING",
		createdAt: 1,
		updatedAt: 1,
		intent: {
			name: "sales.mark-as-fulfilled",
			version: 1,
			args: { requestId: "test", salesIds: [1, 2, 3] },
		},
	};
	const tokens = beginTaskRowActivity(task.ownerId!, task.intent);
	bindTaskRowActivity(task.runId, tokens);
	settleTaskRowActivity(task, "success", {
		outcomes: [
			{ salesId: 1, status: "succeeded" },
			{ salesId: 2, status: "review_required" },
			{ salesId: 3, status: "failed" },
		],
	});
	expect(tokens.map((token) => tableRowActivity.get(token)?.phase)).toEqual([
		"success",
		"review-required",
		"error",
	]);
	tableRowActivity.clearOwner(task.ownerId!);
});

it("restoring an older task never overwrites a newer in-flight action", async () => {
	const { restoreTaskRowActivity } = await import("./sales-task");
	const ownerId = "restore-test";
	const current = tableRowActivity.begin({
		ownerId,
		tableId: "sales-orders",
		entityId: 1,
		label: "New action",
	});
	const old: TaskMonitorTask = {
		id: "old",
		runId: "old",
		accessToken: "test",
		ownerId,
		status: "SYNCING",
		createdAt: 1,
		updatedAt: 1,
		intent: {
			name: "sales.mark-as-fulfilled",
			version: 1,
			args: { requestId: "test", salesIds: [1] },
		},
	};
	restoreTaskRowActivity(old);
	settleTaskRowActivity(old, "success", {
		outcomes: [{ salesId: 1, status: "succeeded" }],
	});
	expect(tableRowActivity.get(current)?.phase).toBe("processing");
	tableRowActivity.clearOwner(ownerId);
});

it("does not revive an ignored old run after newer feedback expires", async () => {
	const { restoreTaskRowActivity, clearOtherRowActivityOwners } = await import(
		"./sales-task"
	);
	const ownerId = "ignored-restore-test";
	const current = tableRowActivity.begin({
		ownerId,
		tableId: "sales-orders",
		entityId: 1,
		label: "New action",
	});
	const old: TaskMonitorTask = {
		id: "ignored-old",
		runId: "ignored-old",
		accessToken: "test",
		ownerId,
		status: "SYNCING",
		createdAt: 1,
		updatedAt: 1,
		intent: {
			name: "sales.mark-as-fulfilled",
			version: 1,
			args: { requestId: "test", salesIds: [1] },
		},
	};
	restoreTaskRowActivity(old);
	tableRowActivity.clear(current);
	restoreTaskRowActivity({ ...old, updatedAt: 2 });
	expect(
		[...tableRowActivity.getSnapshot().values()].filter(
			(activity) => activity.ownerId === ownerId,
		),
	).toEqual([]);
	clearOtherRowActivityOwners(null);
});

it("keeps cancellation neutral and fails only the tokens whose task could not start", async () => {
	const { failTaskRowActivity } = await import("./sales-task");
	const ownerId = "terminal-task-test";
	const intent: TaskMonitorTask["intent"] = {
		name: "sales.mark-as-fulfilled",
		version: 1,
		args: { requestId: "terminal", salesIds: [1] },
	};
	const first = beginTaskRowActivity(ownerId, intent);
	const second = beginTaskRowActivity(ownerId, {
		...intent,
		args: { requestId: "second", salesIds: [2] },
	});
	failTaskRowActivity(first);
	expect(tableRowActivity.get(first[0]!)?.phase).toBe("error");
	expect(tableRowActivity.get(second[0]!)?.phase).toBe("processing");
	bindTaskRowActivity("canceled-run", second);
	settleTaskRowActivity({ runId: "canceled-run" }, "canceled", undefined);
	expect(tableRowActivity.get(second[0]!)?.phase).toBe("canceled");
	tableRowActivity.clearOwner(ownerId);
});

it("settles a local completion before its callback and ignores a later monitor result", () => {
	const ownerId = "local-task-race";
	const intent: TaskMonitorTask["intent"] = {
		name: "sales.mark-as-fulfilled",
		version: 1,
		args: { requestId: "race", salesIds: [1, 2] },
	};
	const tokens = beginTaskRowActivity(ownerId, intent);
	bindTaskRowActivity("race-run", tokens);
	const output = {
		outcomes: [
			{ salesId: 1, status: "succeeded" },
			{ salesId: 2, status: "failed" },
		],
	};
	settleTaskRowActivity({ runId: "race-run" }, "success", output);
	const observedByCallback = tokens.map(
		(token) => tableRowActivity.get(token)?.phase,
	);
	settleTaskRowActivity({ runId: "race-run" }, "success", undefined);
	expect(observedByCallback).toEqual(["success", "error"]);
	expect(tokens.map((token) => tableRowActivity.get(token)?.phase)).toEqual(
		observedByCallback,
	);
	tableRowActivity.clearOwner(ownerId);
});
