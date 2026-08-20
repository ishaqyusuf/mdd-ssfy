import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { continueSaveAfterCommittedChangeReview } from "./save-intent-continuation";

const formSource = readFileSync(
	new URL("./new-sales-form.tsx", import.meta.url),
	"utf8",
);

describe("new sales form save intent continuation", () => {
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

	test("keeps navigation after successful persistence and inventory confirmation", () => {
		const saveIndex = formSource.indexOf("await handlePostSaveSuccess(resp)");
		const inventoryIndex = formSource.indexOf(
			"await configureInventoryAfterSave(resp)",
			saveIndex,
		);
		const navigationIndex = formSource.indexOf("router.push(", inventoryIndex);

		expect(saveIndex > -1).toBe(true);
		expect(inventoryIndex > saveIndex).toBe(true);
		expect(navigationIndex > inventoryIndex).toBe(true);
	});
});
