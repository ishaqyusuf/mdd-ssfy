// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	getActivityCount,
	getActivityTypeSummaries,
	getActivties,
	updateActivityStatus,
	updateAllActivitiesStatus,
} from "./activities";

function createDb() {
	const calls: unknown[] = [];
	const db = {
		noteRecipients: {
			updateMany: (input: unknown) => {
				calls.push(input);
				return Promise.resolve({ count: 1 });
			},
		},
	};

	return { db, calls };
}

describe("notification activity status helpers", () => {
	test("updates only the current recipient's activity receipt", async () => {
		const { db, calls } = createDb();

		await updateActivityStatus(db as never, 42, "archived", 7);

		expect(calls).toEqual([
			{
				where: {
					notePadId: 42,
					notePadContactId: 7,
					deletedAt: null,
				},
				data: {
					status: "archived",
				},
			},
		]);
	});

	test("bulk updates only matching current-recipient statuses", async () => {
		const { db, calls } = createDb();

		await updateAllActivitiesStatus(db as never, {
			notePadContactId: 7,
			status: "read",
			fromStatus: ["unread"],
		});

		expect(calls).toEqual([
			{
				where: {
					notePadContactId: 7,
					deletedAt: null,
					status: {
						in: ["unread"],
					},
				},
				data: {
					status: "read",
				},
			},
		]);
	});
});

describe("notification activity filtering", () => {
	test("filters activity lists by current recipient status and notification type", async () => {
		const calls: Array<{ method: string; input: unknown }> = [];
		const db = {
			notePad: {
				findMany: (input: unknown) => {
					calls.push({ method: "findMany", input });
					return Promise.resolve([]);
				},
				count: (input: unknown) => {
					calls.push({ method: "count", input });
					return Promise.resolve(0);
				},
			},
			storedDocument: {
				findMany: () => Promise.resolve([]),
			},
		};

		await getActivties(db as never, {
			contactIds: [7],
			status: ["unread", "read"],
			type: "sales_checkout_success",
		});

		expect(calls[0]?.input).toMatchObject({
			where: {
				recipients: {
					some: {
						deletedAt: null,
						notePadContactId: {
							in: [7],
						},
						status: {
							in: ["unread", "read"],
						},
					},
				},
				tags: {
					some: {
						deletedAt: null,
						OR: [
							{
								tagName: "type",
								tagValue: {
									in: [
										"sales_checkout_success",
										'"sales_checkout_success"',
									],
								},
							},
							{
								tagName: "channel",
								tagValue: {
									in: [
										"sales_checkout_success",
										'"sales_checkout_success"',
									],
								},
							},
						],
					},
				},
			},
		});
	});

	test("returns an empty page when the selected type is disabled by preferences", async () => {
		const db = {
			notePad: {
				findMany: () => {
					throw new Error("should not query disabled notification type");
				},
				count: () => {
					throw new Error("should not count disabled notification type");
				},
			},
			storedDocument: {
				findMany: () => Promise.resolve([]),
			},
		};

		const result = await getActivties(db as never, {
			contactIds: [7],
			status: ["unread", "read"],
			type: "sales_checkout_success",
			types: ["sales_payment_recorded"],
		});

		expect(result).toEqual({
			data: [],
			meta: {
				count: 0,
				size: 20,
				cursor: null,
			},
		});
	});

	test("counts unread activity with the same recipient and type filters as lists", async () => {
		const calls: unknown[] = [];
		const db = {
			notePad: {
				count: (input: unknown) => {
					calls.push(input);
					return Promise.resolve(3);
				},
			},
		};

		const count = await getActivityCount(db as never, {
			contactIds: [7],
			status: ["unread"],
			types: ["sales_checkout_success"],
		});

		expect(count).toBe(3);
		expect(calls[0]).toMatchObject({
			where: {
				recipients: {
					some: {
						notePadContactId: {
							in: [7],
						},
						status: {
							in: ["unread"],
						},
					},
				},
				tags: {
					some: {
						OR: [
							{
								tagName: "type",
								tagValue: {
									in: [
										"sales_checkout_success",
										'"sales_checkout_success"',
									],
								},
							},
							{
								tagName: "channel",
								tagValue: {
									in: [
										"sales_checkout_success",
										'"sales_checkout_success"',
									],
								},
							},
						],
					},
				},
			},
		});
	});

	test("summarizes available notification types by latest matching activity", async () => {
		const calls: unknown[] = [];
		const db = {
			notePad: {
				findMany: (input: unknown) => {
					calls.push(input);
					return Promise.resolve([
						{
							createdAt: new Date("2026-07-15T12:00:00.000Z"),
							tags: [
								{
									tagName: "type",
									tagValue: "sales_payment_recorded",
								},
							],
						},
						{
							createdAt: new Date("2026-07-15T11:00:00.000Z"),
							tags: [
								{
									tagName: "channel",
									tagValue: '"sales_checkout_success"',
								},
							],
						},
						{
							createdAt: new Date("2026-07-15T10:00:00.000Z"),
							tags: [
								{
									tagName: "type",
									tagValue: "sales_payment_recorded",
								},
							],
						},
					]);
				},
			},
		};

		const summaries = await getActivityTypeSummaries(db as never, {
			contactIds: [7],
			status: ["archived"],
		});

		expect(calls[0]).toMatchObject({
			where: {
				recipients: {
					some: {
						notePadContactId: {
							in: [7],
						},
						status: {
							in: ["archived"],
						},
					},
				},
			},
		});
		expect(summaries).toEqual([
			{
				type: "sales_payment_recorded",
				title: "Sales Payment Recorded",
				count: 2,
				latestAt: new Date("2026-07-15T12:00:00.000Z"),
			},
			{
				type: "sales_checkout_success",
				title: "Sales Checkout Success",
				count: 1,
				latestAt: new Date("2026-07-15T11:00:00.000Z"),
			},
		]);
	});

	test("summarizes by enabled channel when channel and type tags differ", async () => {
		const db = {
			notePad: {
				findMany: () =>
					Promise.resolve([
						{
							createdAt: new Date("2026-07-15T12:00:00.000Z"),
							tags: [
								{
									tagName: "channel",
									tagValue: "inventory_inbound",
								},
								{
									tagName: "type",
									tagValue: "inbound",
								},
							],
						},
					]),
			},
		};

		const summaries = await getActivityTypeSummaries(db as never, {
			contactIds: [7],
			status: ["unread"],
			types: ["inventory_inbound"],
		});

		expect(summaries).toEqual([
			{
				type: "inventory_inbound",
				title: "Inventory Inbound",
				count: 1,
				latestAt: new Date("2026-07-15T12:00:00.000Z"),
			},
		]);
	});
});
