import { describe, expect, it } from "bun:test";
import { explodeTagEntries } from "../src/tag-values";
import { inventoryInboundActivity } from "../src/types/inventory-inbound-activity";

describe("inventory inbound activity notifications", () => {
	it("creates standard channel activity without requiring recipients", () => {
		const activity = inventoryInboundActivity.createActivity(
			{
				inboundId: 12,
				activityType: "created",
				documentIds: ["doc_1", "doc_1"],
				orderNos: ["08601PC", "08601PC"],
				meta: {
					linkedDemandCount: 2,
					type: "custom_type_should_not_override_channel",
				},
			},
			{ id: 7, profileId: 7, name: "Ops User" },
			{ id: 7, profileId: 7, name: "Ops User" },
		);

		expect(inventoryInboundActivity.createActivityWithoutContact).toBe(true);
		expect(activity.type).toBe("inventory_inbound_activity");
		expect(activity.tags).toMatchObject({
			type: "inventory_inbound_activity",
			source: "user",
			priority: 5,
			inboundId: 12,
			activityType: "created",
			linkedDemandCount: 2,
			documentIds: ["doc_1"],
			orderNos: ["08601PC"],
		});
	});

	it("deduplicates repeated array tag values before NoteTags createMany", () => {
		expect(
			explodeTagEntries({
				inboundId: 12,
				orderNos: ["08601PC", "08601PC", "08602PC"],
			}),
		).toEqual([
			{ tagName: "inboundId", tagValue: "12" },
			{ tagName: "orderNos", tagValue: '"08601PC"' },
			{ tagName: "orderNos", tagValue: '"08602PC"' },
		]);
	});
});
