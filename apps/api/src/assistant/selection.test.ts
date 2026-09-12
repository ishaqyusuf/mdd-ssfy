import { afterEach, describe, expect, test } from "bun:test";
import {
	clearAssistantSelectionCachesForTest,
	createAssistantPrepareStep,
	selectAssistantTools,
	warmAssistantToolIndex,
} from "./selection";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: {},
};

afterEach(clearAssistantSelectionCachesForTest);

describe("assistant tool selection", () => {
	test("filters availability and authorization before ranking", async () => {
		const selected = await selectAssistantTools(
			actor,
			"create a sales order and find inventory",
			{ environment: {} },
		);

		expect(selected.sort()).toEqual([
			"system_explain_capability",
			"system_search_tools",
		]);
		expect(selected).not.toContain("sales_create_order");
		expect(selected).not.toContain("inventory_check_status");
	});

	test("keeps capability discovery active across selections", async () => {
		const selected = await selectAssistantTools(actor, "help me", {
			maxTools: 2,
			environment: {},
		});

		expect(selected.sort()).toEqual([
			"system_explain_capability",
			"system_search_tools",
		]);
		expect(
			createAssistantPrepareStep(actor, { environment: {} }),
		).toBeFunction();
	});

	test("warms only the actor-visible public definition index", async () => {
		await expect(warmAssistantToolIndex(actor, {})).resolves.toBeUndefined();
	});
});
