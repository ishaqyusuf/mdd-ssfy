import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	continueSaveAfterCommittedChangeReview,
	createSaveContinuationGuard,
	resolveCommittedChangeSubmissionAction,
	runCommittedChangeSubmission,
} from "./save-intent-continuation";

const formSource = readFileSync(
	new URL("./new-sales-form.tsx", import.meta.url),
	"utf8",
);

describe("new sales form save intent continuation", () => {
	test("polls an already-approved change without submitting it again", () => {
		expect(resolveCommittedChangeSubmissionAction(false)).toBe(
			"create-and-poll",
		);
		expect(resolveCommittedChangeSubmissionAction(true)).toBe("poll");
	});

	test("checks a slow approved change without creating a duplicate adjustment", async () => {
		let createCalls = 0;
		let pollCalls = 0;
		const createAdjustment = async () => {
			createCalls += 1;
		};
		const first = await runCommittedChangeSubmission({
			alreadyCreated: false,
			createAdjustment,
			pollForRefreshedRecord: async () => {
				pollCalls += 1;
				return null;
			},
		});
		const second = await runCommittedChangeSubmission({
			alreadyCreated: first.alreadyCreated,
			createAdjustment,
			pollForRefreshedRecord: async () => {
				pollCalls += 1;
				return { version: "v2" };
			},
		});

		expect(createCalls).toBe(1);
		expect(pollCalls).toBe(2);
		expect(second).toEqual({
			alreadyCreated: false,
			refreshedRecord: { version: "v2" },
		});
	});

	test("resumes Save & Close with the refreshed record after change review", async () => {
		const calls: string[] = [];
		const refreshedRecord = { version: "v2" };

		const result = await continueSaveAfterCommittedChangeReview({
			intent: "close",
			refreshedRecord,
			promptForSpecialOrderDeclaration: (intent, record) => {
				calls.push(`special:${intent}:${record.version}`);
				return false;
			},
			executeSaveIntent: async (intent, record) => {
				calls.push(`save:${intent}:${record.version}`);
			},
		});

		expect(result).toBe("completed");
		expect(calls).toEqual(["special:close:v2", "save:close:v2"]);
	});

	test("waits for the next confirmation instead of saving or navigating early", async () => {
		let saveCalls = 0;

		const result = await continueSaveAfterCommittedChangeReview({
			intent: "close",
			refreshedRecord: { version: "v2" },
			promptForSpecialOrderDeclaration: () => true,
			executeSaveIntent: async () => {
				saveCalls += 1;
			},
		});

		expect(result).toBe("interrupted");
		expect(saveCalls).toBe(0);
	});

	test("consumes one approval continuation exactly once", async () => {
		const guard = createSaveContinuationGuard();
		let saveCalls = 0;
		const input = {
			intent: "close" as const,
			refreshedRecord: { version: "v2" },
			promptForSpecialOrderDeclaration: () => false,
			executeSaveIntent: async () => {
				saveCalls += 1;
			},
			guard,
		};

		expect(await continueSaveAfterCommittedChangeReview(input)).toBe(
			"completed",
		);
		expect(await continueSaveAfterCommittedChangeReview(input)).toBe(
			"duplicate",
		);
		expect(saveCalls).toBe(1);
	});

	test("allows a failed continuation to be retried without closing", async () => {
		const guard = createSaveContinuationGuard();
		let attempts = 0;
		const input = {
			intent: "close" as const,
			refreshedRecord: { version: "v2" },
			promptForSpecialOrderDeclaration: () => false,
			executeSaveIntent: async () => {
				attempts += 1;
				if (attempts === 1) throw new Error("save failed");
			},
			guard,
		};

		await expect(continueSaveAfterCommittedChangeReview(input)).rejects.toThrow(
			"save failed",
		);
		expect(guard.status).toBe("idle");
		expect(await continueSaveAfterCommittedChangeReview(input)).toBe(
			"completed",
		);
		expect(attempts).toBe(2);
	});

	test("cancellation has no save side effect", async () => {
		let saveCalls = 0;
		expect(
			await continueSaveAfterCommittedChangeReview({
				intent: null,
				refreshedRecord: { version: "v2" },
				promptForSpecialOrderDeclaration: () => false,
				executeSaveIntent: async () => {
					saveCalls += 1;
				},
			}),
		).toBe("cancelled");
		expect(saveCalls).toBe(0);
	});

	test("routes a saved order to canonical inventory overview before fallback navigation", () => {
		const saveIndex = formSource.indexOf("await handlePostSaveSuccess(resp)");
		const inventoryIndex = formSource.indexOf(
			"continueToInventoryAfterSave(resp, true)",
			saveIndex,
		);
		const inventoryReturnIndex = formSource.indexOf(
			"if (inventoryOverviewOpened) return",
			inventoryIndex,
		);
		const navigationIndex = formSource.indexOf(
			'intent === "close"',
			inventoryIndex,
		);

		expect(saveIndex > -1).toBe(true);
		expect(inventoryIndex > saveIndex).toBe(true);
		expect(inventoryReturnIndex > inventoryIndex).toBe(true);
		expect(navigationIndex > inventoryReturnIndex).toBe(true);
	});

	test("blocks the save when required change-review preview cannot open", () => {
		const start = formSource.indexOf(
			"async function stopForCommittedChangeReview",
		);
		const end = formSource.indexOf(
			"async function runWithManualSaveLock",
			start,
		);
		const reviewGuardSource = formSource.slice(start, end);

		expect(reviewGuardSource).toContain(
			"if (!opened && intent) setPendingCommittedChangeSaveIntent(null)",
		);
		expect(reviewGuardSource).toContain("return true");
	});
});
