import { describe, expect, it } from "bun:test";

import {
	SpecialOrderApprovalRequiredError,
	assertSpecialOrderOperationAllowed,
	evaluateCurrentSpecialOrderOperation,
	isDispatchProgressionTransition,
} from "./enforcement";

function fakeDb(input: {
	declaration?: "NO" | "YES" | null;
	status?:
		| "NOT_REQUIRED"
		| "SIGNATURE_PENDING"
		| "CUSTOMER_APPROVED"
		| "REAPPROVAL_REQUIRED"
		| "CUSTOMER_DECLINED"
		| null;
	mode?:
		| "WARNING_ONLY"
		| "BLOCK_PURCHASING_AND_PRODUCTION"
		| "BLOCK_ALL_OPERATIONS";
	currentApproval?: boolean;
}) {
	const history: unknown[] = [];
	const operationEvents: unknown[] = [];
	return {
		history,
		operationEvents,
		db: {
			salesOrders: {
				findFirst: async () => ({
					id: 42,
					orderId: "S-42",
					specialOrderDeclaration: input.declaration ?? null,
					specialOrderStatus: input.status ?? null,
					specialOrderRevision: "revision-1",
					currentSpecialOrderApprovalId: input.currentApproval
						? "evidence-1"
						: null,
				}),
			},
			settings: {
				findFirst: async () => ({
					meta: {
						specialOrder: {
							enforcementMode: input.mode ?? "WARNING_ONLY",
						},
					},
				}),
			},
			specialOrderApprovalEvidence: {
				findFirst: async () =>
					input.currentApproval ? { id: "evidence-1" } : null,
			},
			salesHistory: {
				findFirst: async () => (history.length ? { id: 1 } : null),
				create: async (args: unknown) => {
					history.push(args);
					return args;
				},
			},
			specialOrderOperationEvent: {
				upsert: async (args: unknown) => {
					operationEvents.push(args);
					return args;
				},
			},
		},
	};
}

describe("Special Order operational enforcement", () => {
	it("enforces only forward dispatch progression and preserves recovery paths", () => {
		expect(isDispatchProgressionTransition("queue", "packed")).toBe(true);
		expect(isDispatchProgressionTransition("packed", "in progress")).toBe(true);
		expect(isDispatchProgressionTransition("in progress", "completed")).toBe(
			true,
		);
		expect(isDispatchProgressionTransition("completed", "in progress")).toBe(
			false,
		);
		expect(isDispatchProgressionTransition("in progress", "packed")).toBe(
			false,
		);
		expect(isDispatchProgressionTransition("missing items", "queue")).toBe(
			false,
		);
		expect(isDispatchProgressionTransition("packed", "cancelled")).toBe(false);
	});

	it("treats an approval as current only when matching evidence exists", async () => {
		const approved = fakeDb({
			declaration: "YES",
			status: "CUSTOMER_APPROVED",
			mode: "BLOCK_ALL_OPERATIONS",
			currentApproval: true,
		});
		expect(
			await evaluateCurrentSpecialOrderOperation(approved.db as never, {
				salesOrderId: 42,
				operation: "DISPATCH",
			}),
		).toMatchObject({ allowed: true, approvalRequired: false });
	});

	it("blocks with a stable typed result in block mode", async () => {
		const pending = fakeDb({
			declaration: "YES",
			status: "SIGNATURE_PENDING",
			mode: "BLOCK_PURCHASING_AND_PRODUCTION",
		});
		const error = await assertSpecialOrderOperationAllowed(
			pending.db as never,
			{
				salesOrderId: 42,
				operation: "PRODUCTION",
			},
		).catch((caught) => caught);
		expect(error).toBeInstanceOf(SpecialOrderApprovalRequiredError);
		expect(error.code).toBe("SPECIAL_ORDER_APPROVAL_REQUIRED");
		expect(error.decision).toMatchObject({ orderNo: "S-42", blocked: true });
	});

	it("allows warning mode and records attributable observability", async () => {
		const pending = fakeDb({
			declaration: "YES",
			status: "SIGNATURE_PENDING",
			mode: "WARNING_ONLY",
		});
		const result = await assertSpecialOrderOperationAllowed(
			pending.db as never,
			{
				salesOrderId: 42,
				operation: "PACKING",
				actorUserId: 9,
				authorName: "Warehouse",
				source: "test",
			},
		);
		expect(result).toMatchObject({ allowed: true, warning: true });
		expect(pending.history).toHaveLength(1);
		expect(pending.operationEvents).toHaveLength(1);
		await assertSpecialOrderOperationAllowed(pending.db as never, {
			salesOrderId: 42,
			operation: "PACKING",
			actorUserId: 9,
			authorName: "Warehouse",
			source: "test",
		});
		expect(pending.history).toHaveLength(1);
		expect(pending.operationEvents).toHaveLength(2);
	});

	it("implements the complete enforcement mode and operation matrix", async () => {
		const operations = [
			"PURCHASING",
			"PRODUCTION",
			"PACKING",
			"DISPATCH",
		] as const;
		for (const operation of operations) {
			const warning = fakeDb({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				mode: "WARNING_ONLY",
			});
			expect(
				await evaluateCurrentSpecialOrderOperation(warning.db as never, {
					salesOrderId: 42,
					operation,
				}),
			).toMatchObject({ allowed: true, warning: true, blocked: false });

			const purchasingProduction = fakeDb({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				mode: "BLOCK_PURCHASING_AND_PRODUCTION",
			});
			expect(
				await evaluateCurrentSpecialOrderOperation(
					purchasingProduction.db as never,
					{ salesOrderId: 42, operation },
				),
			).toMatchObject({
				allowed: operation === "PACKING" || operation === "DISPATCH",
				blocked: operation === "PURCHASING" || operation === "PRODUCTION",
			});

			const blockAll = fakeDb({
				declaration: "YES",
				status: "REAPPROVAL_REQUIRED",
				mode: "BLOCK_ALL_OPERATIONS",
			});
			expect(
				await evaluateCurrentSpecialOrderOperation(blockAll.db as never, {
					salesOrderId: 42,
					operation,
				}),
			).toMatchObject({ allowed: false, blocked: true });
		}
	});

	it("never blocks approved, explicit No, or legacy orders", async () => {
		for (const input of [
			{
				declaration: "YES" as const,
				status: "CUSTOMER_APPROVED" as const,
				currentApproval: true,
			},
			{ declaration: "NO" as const, status: "NOT_REQUIRED" as const },
			{ declaration: null, status: null },
		]) {
			const state = fakeDb({ ...input, mode: "BLOCK_ALL_OPERATIONS" });
			for (const operation of [
				"PURCHASING",
				"PRODUCTION",
				"PACKING",
				"DISPATCH",
			] as const) {
				expect(
					await evaluateCurrentSpecialOrderOperation(state.db as never, {
						salesOrderId: 42,
						operation,
					}),
				).toMatchObject({ allowed: true, blocked: false, warning: false });
			}
		}
	});
});
