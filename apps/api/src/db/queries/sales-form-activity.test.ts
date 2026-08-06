import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import {
	buildInboundDemandAdjustmentActivity,
	buildSalesFormAdjustmentActivity,
	buildSalesFormUpdateActivity,
	createSalesFormTimelineActivity,
} from "./sales-form-activity";

describe("sales form activity copy", () => {
	it("describes quantity reductions and total changes on an existing sale update", () => {
		const activity = buildSalesFormUpdateActivity({
			salesType: "order",
			orderId: "09165AD",
			status: "Active",
			autosave: false,
			beforeGrandTotal: 850,
			afterGrandTotal: 650,
			beforeLines: [{ id: 12, uid: "door", title: "Interior door", qty: 5 }],
			afterLines: [{ id: 12, uid: "door", title: "Interior door", qty: 3 }],
		});

		expect(activity).toMatchObject({
			subject: "Sale updated",
			headline: "Sale 09165AD was updated in the sales form.",
			activityType: "sales_form_updated",
		});
		expect(activity.note).toContain("Interior door: 5 → 3");
		expect(activity.note).toContain("Order total: $850.00 → $650.00");
	});

	it("uses quote and autosave language for quote autosaves", () => {
		const activity = buildSalesFormUpdateActivity({
			salesType: "quote",
			orderId: "09165Q",
			status: "Draft",
			autosave: true,
			beforeGrandTotal: 100,
			afterGrandTotal: 100,
			beforeLines: [],
			afterLines: [],
		});

		expect(activity.subject).toBe("Quote autosaved");
		expect(activity.headline).toBe(
			"Quote 09165Q was autosaved in the sales form.",
		);
		expect(activity.note).toContain("Status: Draft.");
	});

	it("describes a newly created quantity-reduction review", () => {
		const activity = buildSalesFormAdjustmentActivity({
			orderId: "09165AD",
			direction: "REDUCTION",
			beforeGrandTotal: 850,
			afterGrandTotal: 650,
			lines: [
				{
					title: "Interior door",
					beforeQty: 5,
					afterQty: 3,
				},
			],
		});

		expect(activity).toMatchObject({
			subject: "Quantity reduction review",
			headline:
				"Quantity reduction was found on sale 09165AD and recorded for review.",
			activityType: "sales_quantity_reduction_review",
		});
		expect(activity.note).toContain("Interior door: 5 → 3");
		expect(activity.note).toContain("Order total: $850.00 → $650.00");
	});

	it("records an actor-attributed inbound removal without cancelling the sale demand", () => {
		const activity = buildInboundDemandAdjustmentActivity({
			orderId: "09159PC",
			inboundId: 71,
			lineTitle: "Oak door",
			previousQty: 4,
			targetQty: 0,
			receivedQty: 0,
		});

		expect(activity).toMatchObject({
			subject: "Item removed from inbound",
			activityType: "sales_inbound_item_removed",
		});
		expect(activity.note).toContain(
			"sales demand remains open and may be assigned to another inbound",
		);
	});

	it("persists canonical sale identity and activity tags", async () => {
		const writes: unknown[] = [];
		const db = {
			notePad: {
				create: async (input: unknown) => {
					writes.push(input);
					return { id: 44 };
				},
			},
		} as unknown as TRPCContext["db"];

		await createSalesFormTimelineActivity(db, {
			salesId: 91,
			orderId: "09165AD",
			senderContactId: 7,
			copy: buildSalesFormAdjustmentActivity({
				orderId: "09165AD",
				direction: "REDUCTION",
				beforeGrandTotal: 500,
				afterGrandTotal: 300,
				lines: [{ title: "Interior door", beforeQty: 5, afterQty: 3 }],
			}),
		});

		const write = writes[0] as {
			data: {
				senderContactId: number;
				tags: {
					createMany: {
						data: Array<{ tagName: string; tagValue: string }>;
					};
				};
			};
		};
		expect(writes).toHaveLength(1);
		expect(write.data.senderContactId).toBe(7);
		expect(write.data.tags.createMany.data).toContainEqual({
			tagName: "salesId",
			tagValue: "91",
		});
		expect(write.data.tags.createMany.data).toContainEqual({
			tagName: "salesNo",
			tagValue: "09165AD",
		});
		expect(write.data.tags.createMany.data).toContainEqual({
			tagName: "activity",
			tagValue: "sales_quantity_reduction_review",
		});
	});
});
