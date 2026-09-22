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
			"system_request_capability",
			"system_search_tools",
		]);
		expect(selected).not.toContain("sales_create_order");
		expect(selected).not.toContain("inventory_check_status");
	});

	test("keeps capability discovery active across selections", async () => {
		const selected = await selectAssistantTools(actor, "help me", {
			maxTools: 3,
			environment: {},
		});

		expect(selected.sort()).toEqual([
			"system_explain_capability",
			"system_request_capability",
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
			grants: { viewOrders: true, viewSalesCustomers: true },
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

	test("selects authorized operations reads from natural requests", async () => {
		const operationsActor = {
			...actor,
			grants: {
				viewOrders: true,
				viewProduction: true,
				viewInventory: true,
				viewCommunity: true,
			},
		};
		const cases = [
			["show the production assignment schedule", "production_get_schedule"],
			["check current production status", "production_check_status"],
			["check inventory status for oak jambs", "inventory_check_status"],
			["show material demand and inbound shortages", "inventory_get_demand"],
			["is order 09502PC packed for delivery", "fulfillment_check_status"],
			[
				"explain the fulfillment exceptions for 09502PC",
				"fulfillment_explain_exceptions",
			],
			["find the North Ridge community project", "community_search"],
			[
				"summarize units and jobs for North Ridge project",
				"community_get_project_summary",
			],
			["list every unit in the North Ridge project", "community_list_units"],
		] as const;

		for (const [query, expected] of cases) {
			const selected = await selectAssistantTools(operationsActor, query, {
				maxTools: 8,
				environment: {},
			});
			expect(selected).toContain(expected);
		}
	});
});
