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

	test("selects the authorized Sales and customer reads from natural requests", async () => {
		const readActor = {
			...actor,
			grants: { viewOrders: true, viewCustomers: true },
		};
		const cases = [
			["Which orders belong to Ada Millwork?", "sales_find_orders"],
			[
				"What is the current status of order 09502PC?",
				"sales_get_order_status",
			],
			["What is blocking order 09502PC?", "sales_explain_blockers"],
			["Show the activity timeline for order 09502PC", "sales_get_timeline"],
			["find the customer named Jordan", "customers_find"],
			["Summarize the customer Ada Millwork", "customers_get_summary"],
			[
				"Show Ada Millwork customer order history",
				"customers_get_order_history",
			],
		] as const;

		for (const [query, expected] of cases) {
			const selected = await selectAssistantTools(readActor, query, {
				maxTools: 6,
				environment: {},
			});
			expect(selected).toContain(expected);
		}
	});
});
