import { describe, expect, test } from "bun:test";
import {
	collectAssistantInvalidations,
	dispatchAssistantInvalidations,
} from "./assistant-tool-invalidation";

describe("assistant tool invalidation", () => {
	test("deduplicates successful tool events and drops unknown tags", () => {
		const processed = new Set<string>();
		const messages = [
			{
				parts: [
					{
						type: "data-assistant-invalidation",
						data: {
							toolCallId: "call-1",
							tags: ["sales.orders", "sales.orders", "database.all"],
						},
					},
				],
			},
		];

		expect(collectAssistantInvalidations(messages, processed)).toEqual([
			{ toolCallId: "call-1", tags: ["sales.orders"] },
		]);
		expect(collectAssistantInvalidations(messages, processed)).toEqual([]);
	});

	test("ignores denied and malformed records", () => {
		const processed = new Set<string>();
		expect(
			collectAssistantInvalidations(
				[
					{
						parts: [
							{
								type: "data-assistant-invalidation",
								data: { toolCallId: "", tags: ["customers"] },
							},
							{ type: "data-assistant-card", data: { kind: "permission" } },
						],
					},
				],
				processed,
			),
		).toEqual([]);
	});

	test("refreshes exact domain events and global search once per batch", async () => {
		const emitted: string[] = [];
		let globalRefreshes = 0;
		await dispatchAssistantInvalidations(
			[
				{ toolCallId: "1", tags: ["sales.orders", "customers"] },
				{ toolCallId: "2", tags: ["sales.orders"] },
			],
			{
				emit: (event) => emitted.push(event),
				invalidateGlobalSearch: () => {
					globalRefreshes += 1;
				},
			},
		);
		expect(emitted).toEqual(["sales.order.changed", "customer.changed"]);
		expect(globalRefreshes).toBe(1);
	});
});
