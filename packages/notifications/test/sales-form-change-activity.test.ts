import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import {
	updateSalesFormChangeActivity,
	attachSalesItemChangeSummaries,
} from "../src/sales-form-change-activity";
import { transformNotifications } from "../src/notification-center";

describe("sales change notification lifecycle", () => {
	it("updates the existing linked note and never creates duplicate activity", async () => {
		const tags = new Map<string, string>([
			["changeHistoryId", "history-1"],
			["salesId", "91"],
		]);
		const lifecycle: Array<Record<string, unknown>> = [];
		let receiptUpdates = 0;
		const db = {
			salesHistory: {
				create: async ({
					data,
				}: { data: { salesId: number; data: Record<string, unknown> } }) => {
					expect(data.salesId).toBe(91);
					lifecycle.push(data.data);
				},
			},
			notePad: {
				findFirst: async () => ({
					id: 55,
					tags: [...tags.entries()].map(([tagName, tagValue]) => ({
						tagName,
						tagValue,
					})),
				}),
			},
			noteTags: {
				deleteMany: async ({ where }: { where: { tagName: string } }) => {
					tags.delete(where.tagName);
				},
				create: async ({
					data,
				}: { data: { tagName: string; tagValue: string } }) => {
					tags.set(data.tagName, data.tagValue);
				},
			},
			noteRecipients: {
				updateMany: async () => {
					receiptUpdates++;
				},
			},
		} as unknown as Db;
		await updateSalesFormChangeActivity(db, {
			adjustmentId: "adjustment-1",
			status: "APPLYING",
		});
		expect(tags.get("changeStatus")).toBe("APPLYING");
		expect(receiptUpdates).toBe(0);
		await updateSalesFormChangeActivity(db, {
			adjustmentId: "adjustment-1",
			status: "APPROVED",
			applicationFailed: true,
		});
		expect(tags.get("applicationFailed")).toBe("true");
		await updateSalesFormChangeActivity(db, {
			adjustmentId: "adjustment-1",
			status: "APPLIED",
		});
		expect(tags.get("changeStatus")).toBe("APPLIED");
		expect(tags.get("applicationFailed")).toBe("false");
		expect(receiptUpdates).toBe(2);
		expect(
			lifecycle.map(({ status, applicationFailed }) => ({
				status,
				applicationFailed,
			})),
		).toEqual([
			{ status: "APPLYING", applicationFailed: false },
			{ status: "APPROVED", applicationFailed: true },
			{ status: "APPLIED", applicationFailed: false },
		]);
		expect(
			lifecycle.every((event) => event.changeHistoryId === "history-1"),
		).toBe(true);
		await updateSalesFormChangeActivity(db, {
			adjustmentId: "adjustment-1",
			status: "APPLIED",
		});
		expect(receiptUpdates).toBe(2);
		expect(lifecycle).toHaveLength(3);
	});
	it("links a bell notification to the exact sale activity", () => {
		const [notification] = transformNotifications([
			{
				id: 55,
				subject: "Sale updated",
				tags: {
					type: "sales_form_change",
					salesId: "91",
					salesNo: "09165AD",
					salesType: "order",
				},
			},
		]);
		expect(notification?.action).toEqual({
			type: "sales_form_change",
			label: "View changes",
			data: { salesId: "91", salesNo: "09165AD", salesType: "order" },
		});
		expect(notification?.id).toBe(55);
	});
	it("doesn't create actions for malformed references", () => {
		const [notification] = transformNotifications([
			{ id: 55, tags: { type: "sales_form_change", salesId: "91" } },
		]);
		expect(notification?.action).toBeUndefined();
	});
});

describe("simple sales activity presentation", () => {
	it("simplifies stored history in one sale-scoped read without changing it", async () => {
		const calls: unknown[] = [];
		const record = {
			event: "sales_form_change",
			schemaVersion: 1,
			changes: [
				{
					key: "line:item:qty",
					item: "Item X",
					field: "Quantity",
					before: "1",
					after: "2",
				},
				{
					key: "line:item:unitPrice",
					item: "Item X",
					field: "Unit price",
					before: "$10.00",
					after: "$20.00",
				},
			],
		};
		const db = {
			salesHistory: {
				findMany: async (input: unknown) => {
					calls.push(input);
					return [{ id: "history-1", salesId: 91, data: record }];
				},
			},
		} as unknown as Db;
		const original = {
			id: 55,
			headline: "20 changes · total $10 → $20",
			note: "Unit price: $10 → $20",
			tags: {
				type: "sales_form_change",
				salesId: "91",
				salesNo: "09165AD",
				salesType: "order",
				changeHistoryId: "history-1",
				changeStatus: "APPLIED",
			},
		};
		const [activity] = await attachSalesItemChangeSummaries(
			db,
			[original, { ...original, id: 56 }],
			[91],
		);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			where: { deletedAt: null, OR: [{ id: "history-1", salesId: 91 }] },
		});
		expect(activity?.headline).toBe("1 item changed");
		expect(activity?.note).toBeNull();
		expect(activity?.salesChangeSummary).toEqual({
			messages: ["Item X: quantity 1 → 2"],
			itemCount: 1,
		});
		expect(original.note).toContain("$10");
		expect(record.changes).toHaveLength(2);
		const [notification] = transformNotifications([activity!]);
		expect(notification?.description).toBe("09165AD: Item X: quantity 1 → 2");
		expect(notification?.note).toBeNull();
		expect(notification?.action?.type).toBe("sales_form_change");
	});
	it("does not fetch history for sales outside the allowed scope", async () => {
		const db = {
			salesHistory: {
				findMany: async () => {
					throw new Error("Unexpected history access");
				},
			},
		} as unknown as Db;
		const [activity] = await attachSalesItemChangeSummaries(
			db,
			[
				{
					headline: "$10 → $20",
					note: "$10 → $20",
					tags: {
						type: "sales_form_change",
						salesId: "91",
						changeHistoryId: "history-1",
					},
				},
			],
			[],
		);
		expect(activity?.salesChangeSummary?.messages).toEqual([
			"Sale details updated",
		]);
		expect(activity?.headline).toBeNull();
		expect(activity?.note).toBeNull();
	});
	it("never matches a history record belonging to a different sale", async () => {
		const db = {
			salesHistory: {
				findMany: async () => [
					{
						id: "history-1",
						salesId: 92,
						data: {
							event: "sales_form_change",
							schemaVersion: 1,
							changes: [
								{
									key: "line:a:qty",
									item: "Other sale item",
									field: "Quantity",
									before: "1",
									after: "2",
								},
							],
						},
					},
				],
			},
		} as unknown as Db;
		const [activity] = await attachSalesItemChangeSummaries(
			db,
			[
				{
					headline: null,
					note: null,
					tags: {
						type: "sales_form_change",
						salesId: "91",
						changeHistoryId: "history-1",
					},
				},
			],
			[91],
		);
		expect(activity?.salesChangeSummary?.messages).toEqual([
			"Sale details updated",
		]);
	});
});
