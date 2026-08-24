import { describe, expect, it, mock } from "bun:test";
import type { UpdateSalesControl } from "../schema";
import {
	authorizeSalesControlTaskInput,
	normalizeSalesControlTaskActor,
} from "./task-authorization";

function makeDb(
	dispatches: Array<{
		id: number;
		salesOrderId: number;
		driverId: number | null;
		deletedAt?: Date | null;
	}> = [],
	ownedSubmissionIds: number[] = [],
) {
	return {
		users: {
			findFirst: mock(async ({ where }: any) =>
				where.id === 7 ? { id: 7, name: "Authenticated Operator" } : null,
			),
		},
		orderDelivery: {
			findMany: mock(async ({ where }: any) =>
				dispatches
					.filter(
						(dispatch) =>
							where.id.in.includes(dispatch.id) &&
							dispatch.salesOrderId === where.salesOrderId &&
							(dispatch.deletedAt ?? null) === null,
					)
					.map(({ id, driverId }) => ({ id, driverId })),
			),
		},
		orderProductionSubmissions: {
			findMany: mock(async ({ where }: any) =>
				where.id.in
					.filter((id: number) => ownedSubmissionIds.includes(id))
					.map((id: number) => ({ id })),
			),
		},
	};
}

function packingInput(overrides: Partial<UpdateSalesControl> = {}) {
	return {
		meta: {
			salesId: 91,
			authorId: 999,
			authorName: "Forged Actor",
			allowProductionSubmissionForOthers: true,
		},
		packItems: {
			dispatchId: 41,
			dispatchStatus: "queue",
			packMode: "selection",
			packingLines: [],
		},
		...overrides,
	} as UpdateSalesControl;
}

function fulfilledInput() {
	return {
		meta: {
			salesId: 91,
			authorId: 999,
			authorName: "Forged Actor",
		},
		markAsCompleted: { dispatchId: 41 },
	} as UpdateSalesControl;
}

describe("sales-control task authorization", () => {
	it("normalizes direct task metadata from the authenticated server actor", () => {
		const result = normalizeSalesControlTaskActor(packingInput(), {
			userId: 7,
			name: "Authenticated Operator",
			canEditProduction: false,
		});

		expect(result.meta).toEqual({
			salesId: 91,
			authorId: 7,
			authorName: "Authenticated Operator",
			allowProductionSubmissionForOthers: false,
		});
	});

	it("rejects an unauthenticated actor before a task can be authorized", async () => {
		await expect(
			authorizeSalesControlTaskInput(makeDb() as any, packingInput(), {
				userId: 0,
				can: { viewPacking: true },
			}),
		).rejects.toThrow("Authentication is required");
	});

	it("overwrites forged actor identity and elevated production metadata", async () => {
		const result = await authorizeSalesControlTaskInput(
			makeDb([{ id: 41, salesOrderId: 91, driverId: 12 }]) as any,
			packingInput(),
			{ userId: 7, can: { viewPacking: true } },
		);

		expect(result.meta).toEqual({
			salesId: 91,
			authorId: 7,
			authorName: "Authenticated Operator",
			allowProductionSubmissionForOthers: false,
		});
	});

	it("allows an assigned dispatch worker with the worker permission", async () => {
		const result = await authorizeSalesControlTaskInput(
			makeDb([{ id: 41, salesOrderId: 91, driverId: 7 }]) as any,
			packingInput(),
			{ userId: 7, can: { viewDelivery: true } },
		);

		expect(result.meta.authorId).toBe(7);
	});

	it("rejects a worker who is not assigned to the requested dispatch", async () => {
		await expect(
			authorizeSalesControlTaskInput(
				makeDb([{ id: 41, salesOrderId: 91, driverId: 8 }]) as any,
				packingInput(),
				{ userId: 7, can: { viewDelivery: true } },
			),
		).rejects.toThrow("Only the assigned dispatch actor");
	});

	it("rejects a cross-sale dispatch even for a packing manager", async () => {
		await expect(
			authorizeSalesControlTaskInput(
				makeDb([{ id: 41, salesOrderId: 92, driverId: 7 }]) as any,
				packingInput(),
				{ userId: 7, can: { viewPacking: true } },
			),
		).rejects.toThrow("do not belong to this sales order");
	});

	it("authorizes fulfillment with the view-prefixed action permission", async () => {
		await expect(
			authorizeSalesControlTaskInput(
				makeDb([{ id: 41, salesOrderId: 91, driverId: null }]) as any,
				fulfilledInput(),
				{ userId: 7, can: { viewMarkSalesOrderFulfilled: true } },
			),
		).resolves.toMatchObject({ meta: { authorId: 7 } });
	});

	it("does not let broad order access replace fulfillment permission", async () => {
		await expect(
			authorizeSalesControlTaskInput(
				makeDb([{ id: 41, salesOrderId: 91, driverId: null }]) as any,
				fulfilledInput(),
				{ userId: 7, can: { editOrders: true } },
			),
		).rejects.toThrow("permission to mark sales orders fulfilled");
	});

	it("derives submit-for-others capability from editProduction", async () => {
		const input = {
			meta: {
				salesId: 91,
				authorId: 999,
				authorName: "Forged Actor",
				allowProductionSubmissionForOthers: true,
			},
			submitAll: { assignedToId: 22 },
		} as UpdateSalesControl;

		const worker = await authorizeSalesControlTaskInput(
			makeDb() as any,
			input,
			{ userId: 7, can: { viewProduction: true } },
		);
		const editor = await authorizeSalesControlTaskInput(
			makeDb() as any,
			input,
			{ userId: 7, can: { editProduction: true } },
		);

		expect(worker.meta.allowProductionSubmissionForOthers).toBe(false);
		expect(editor.meta.allowProductionSubmissionForOthers).toBe(true);
	});

	it("preserves worker self-service updates only for owned submissions", async () => {
		const input = {
			meta: { salesId: 91, authorId: 999, authorName: "Forged Actor" },
			updateSubmissions: {
				submissions: [{ submissionId: 501, qty: { qty: 1 } }],
			},
		} as UpdateSalesControl;

		await expect(
			authorizeSalesControlTaskInput(makeDb([], [501]) as any, input, {
				userId: 7,
				can: { viewProduction: true },
			}),
		).resolves.toMatchObject({ meta: { authorId: 7 } });
		await expect(
			authorizeSalesControlTaskInput(makeDb([], []) as any, input, {
				userId: 7,
				can: { viewProduction: true },
			}),
		).rejects.toThrow("only their own submissions");
	});
});
