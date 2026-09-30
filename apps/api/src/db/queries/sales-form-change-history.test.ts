import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { recordSalesFormChanges } from "./sales-form-change-history";

function fixture() {
	const histories: Array<Record<string, any>> = [],
		activities: Array<Record<string, any>> = [];
	const db = {
		salesHistory: {
			create: async ({ data }: { data: Record<string, any> }) => {
				histories.push(data);
				return { id: "history-1" };
			},
		},
		notePad: {
			create: async ({ data }: { data: Record<string, any> }) => {
				activities.push(data);
				return { id: 55 };
			},
		},
		noteChannels: { findUnique: async () => null },
	} as unknown as TRPCContext["db"];
	const input = {
		salesId: 91,
		orderId: "09165AD",
		salesType: "order" as const,
		actorUserId: 7,
		senderContactId: 19,
		before: { form: { notes: "Original" } },
		after: { form: { notes: "Updated notes ".repeat(60) } },
	};
	return { db, histories, activities, input };
}
describe("sales changes persisted with activity", () => {
	it("retains untruncated changes and connects activity/notification to the same record", async () => {
		const f = fixture();
		expect(await recordSalesFormChanges(f.db, f.input)).toEqual({
			historyId: "history-1",
			activityId: 55,
		});
		expect(f.histories[0]!.data.changes[0].after).toHaveLength(840);
		expect(f.activities[0]!.note.length).toBeLessThanOrEqual(191);
		expect(f.activities[0]!.tags.createMany.data).toContainEqual({
			tagName: "changeHistoryId",
			tagValue: "history-1",
		});
		expect(f.activities[0]!.recipients.createMany.data).toEqual([
			{ notePadContactId: 19, status: "unread" },
		]);
	});
	it("does not create history or notify for unchanged saves", async () => {
		const f = fixture();
		expect(
			await recordSalesFormChanges(f.db, { ...f.input, after: f.input.before }),
		).toBeNull();
		expect(f.histories).toHaveLength(0);
		expect(f.activities).toHaveLength(0);
	});
	it("writes basic item copy instead of financial field changes", async () => {
		const f = fixture();
		await recordSalesFormChanges(f.db, {
			...f.input,
			before: {
				lineItems: [{ uid: "item", title: "Item X", qty: 1, unitPrice: 10 }],
				summary: { grandTotal: 10 },
			},
			after: {
				lineItems: [{ uid: "item", title: "Item X", qty: 2, unitPrice: 20 }],
				summary: { grandTotal: 40 },
			},
		});
		expect(f.activities[0]!.headline).toBe("Sale 09165AD: 1 item changed.");
		expect(f.activities[0]!.note).toBe("Item X: quantity 1 → 2");
		expect(f.activities[0]!.tags.createMany.data).toContainEqual({
			tagName: "changeCount",
			tagValue: "1",
		});
	});
	it("records autosaves without an unread notification", async () => {
		const f = fixture();
		await recordSalesFormChanges(f.db, { ...f.input, autosave: true });
		expect(f.histories).toHaveLength(1);
		expect(f.activities[0]!.recipients).toBeUndefined();
	});
	it("keeps the reviewed adjustment identity and approval state", async () => {
		const f = fixture();
		await recordSalesFormChanges(f.db, {
			...f.input,
			adjustmentId: "adjustment-1",
			reason: "Reduced customer need",
		});
		expect(f.histories[0]!.data).toMatchObject({
			adjustmentId: "adjustment-1",
			reason: "Reduced customer need",
		});
		expect(f.activities[0]!.tags.createMany.data).toContainEqual({
			tagName: "changeStatus",
			tagValue: "APPROVED",
		});
	});
});

describe("sales change history access", () => {
	function readFixture(permissions = ["viewOrders"]) {
		const record = {
			event: "sales_form_change",
			schemaVersion: 1,
			actorUserId: 7,
			adjustmentId: null,
			changes: [
				{
					key: "form:po",
					item: "Sale details",
					field: "PO number",
					before: null,
					after: "PO-2",
				},
			],
		};
		const calls: unknown[] = [];
		const db = {
			users: {
				findFirstOrThrow: async () => ({
					id: 7,
					roles: [{ role: { id: 3, name: "Sales Team" } }],
				}),
				findFirst: async () => ({ name: "Sales Rep" }),
			},
			roles: {
				findFirstOrThrow: async () => ({
					name: "Sales Team",
					RoleHasPermissions: permissions.map((name) => ({
						permission: { name },
					})),
				}),
			},
			modelHasPermissions: { findMany: async () => [] },
			salesOrders: {
				findFirst: async () => ({ id: 91, dealerAuthId: null, type: "order" }),
				findMany: async (input: unknown) => {
					calls.push(input);
					return [{ id: 91, dealerAuthId: null, type: "order" }];
				},
			},
			notePad: {
				findFirst: async (input: unknown) => {
					calls.push(input);
					return {
						createdAt: new Date(),
						senderContact: { name: "Sales Rep" },
						tags: [{ tagName: "changeHistoryId", tagValue: "history-1" }],
					};
				},
			},
			salesHistory: {
				findFirst: async (input: unknown) => {
					calls.push(input);
					return { data: record };
				},
			},
		} as unknown as TRPCContext["db"];
		return { ctx: { db, userId: 7 } as TRPCContext, calls };
	}
	it("scopes the activity and saved comparison to the requested sale", async () => {
		const { getSalesFormChangeHistory } = await import(
			"./sales-form-change-history"
		);
		const f = readFixture();
		const result = await getSalesFormChangeHistory(f.ctx, {
			salesId: 91,
			activityId: 55,
		});
		expect(result.status).toBe("APPLIED");
		expect(f.calls[0]).toMatchObject({
			where: { id: 55, tags: { some: { tagName: "salesId", tagValue: "91" } } },
		});
		expect(f.calls[1]).toMatchObject({
			where: { id: "history-1", salesId: 91 },
		});
	});
	it("rejects users without order access, including quote-only users", async () => {
		const { getSalesFormChangeHistory } = await import(
			"./sales-form-change-history"
		);
		await expect(
			getSalesFormChangeHistory(readFixture([]).ctx, {
				salesId: 91,
				activityId: 55,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			getSalesFormChangeHistory(readFixture(["viewEstimates"]).ctx, {
				salesId: 91,
				activityId: 55,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
	it("keeps batch summaries limited to authenticated users with document access", async () => {
		const { getSalesChangeHistoryAccess } = await import(
			"./sales-form-change-history"
		);
		const f = readFixture();
		expect(
			await getSalesChangeHistoryAccess(
				{ ...f.ctx, userId: undefined } as TRPCContext,
				[91],
			),
		).toEqual([]);
		expect(
			await getSalesChangeHistoryAccess(readFixture([]).ctx, [91]),
		).toEqual([]);
		expect(
			await getSalesChangeHistoryAccess(
				readFixture(["viewEstimates"]).ctx,
				[91],
			),
		).toEqual([]);
		expect(await getSalesChangeHistoryAccess(f.ctx, [91])).toEqual([91]);
		expect(f.calls[0]).toMatchObject({
			where: { id: { in: [91] }, deletedAt: null },
		});
	});
});
