import { describe, expect, test } from "bun:test";
import { hashPassword } from "@gnd/utils/crypto";

import {
	getSalesRepTransferOptions,
	transferSalesRep,
} from "./sales-rep-transfer";

function buildUser(
	id: number,
	name: string,
	roleName: string,
	passwordHash: string | null = null,
) {
	return {
		id,
		name,
		email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
		username: null,
		password: passwordHash,
		roles: [
			{
				role: {
					name: roleName,
					RoleHasPermissions: [],
				},
			},
		],
	};
}

function buildTransferContext({
	actorId = 1,
	actorName = "Admin User",
	actorRole = "Super Admin",
	currentSalesRepId = 2,
	targetSalesRepId = 3,
	passwordHash = "",
}: {
	actorId?: number;
	actorName?: string;
	actorRole?: string;
	currentSalesRepId?: number | null;
	targetSalesRepId?: number;
	passwordHash?: string;
} = {}) {
	const actor = buildUser(actorId, actorName, actorRole, passwordHash);
	const target = buildUser(targetSalesRepId, "Actual Rep", "Sales Rep");
	const users = new Map<number, ReturnType<typeof buildUser>>([
		[actor.id, actor],
		[target.id, target],
	]);
	const calls: Array<{ name: string; payload: unknown }> = [];
	const tx = {
		users: {
			findFirst: async ({ where }: { where: { id: number } }) =>
				users.get(where.id) ?? null,
			findMany: async () => Array.from(users.values()),
		},
		salesOrders: {
			findFirst: async () => ({
				id: 44,
				orderId: "04780AD",
				slug: "04780ad",
				salesRepId: currentSalesRepId,
				salesRep: currentSalesRepId
					? {
							id: currentSalesRepId,
							name: "Original Rep",
							email: "original.rep@example.com",
						}
					: null,
			}),
			update: async (payload: unknown) => {
				calls.push({ name: "salesOrders.update", payload });
				return { id: 44 };
			},
		},
		salesHistory: {
			create: async (payload: unknown) => {
				calls.push({ name: "salesHistory.create", payload });
				return { id: "history-id" };
			},
		},
	};

	return {
		calls,
		ctx: {
			userId: actor.id,
			db: {
				...tx,
				modelHasPermissions: {
					findMany: async () => [],
				},
				$transaction: async (callback: (client: typeof tx) => unknown) =>
					callback(tx),
			},
		} as unknown as Parameters<typeof transferSalesRep>[0],
	};
}

describe("transferSalesRep", () => {
	test("updates the order sales rep and writes sales history", async () => {
		const { ctx, calls } = buildTransferContext({
			passwordHash: await hashPassword("confirm-pass"),
		});

		const result = await transferSalesRep(ctx, {
			salesId: 44,
			salesRepId: 3,
			reason: "created by actual rep",
			password: "confirm-pass",
		});

		expect(result.changed).toBe(true);
		expect(result.salesRep.name).toBe("Actual Rep");
		expect(calls.find((call) => call.name === "salesOrders.update")).toEqual({
			name: "salesOrders.update",
			payload: {
				where: { id: 44 },
				data: { salesRepId: 3 },
				select: { id: true },
			},
		});
		expect(
			calls.find((call) => call.name === "salesHistory.create"),
		).toMatchObject({
			name: "salesHistory.create",
			payload: {
				data: {
					salesId: 44,
					name: "Sales rep transferred",
					authorName: "Admin User",
					data: {
						type: "sales_rep_transfer",
						orderId: "04780AD",
						previousSalesRep: {
							id: 2,
							name: "Original Rep",
						},
						nextSalesRep: {
							id: 3,
							name: "Actual Rep",
						},
						reason: "created by actual rep",
						triggeredByUserId: 1,
					},
				},
			},
		});
	});

	test("allows a sales rep to transfer an order assigned to them", async () => {
		const { ctx, calls } = buildTransferContext({
			actorId: 2,
			actorName: "Original Rep",
			actorRole: "Sales Rep",
			currentSalesRepId: 2,
			passwordHash: await hashPassword("owner-pass"),
		});

		const result = await transferSalesRep(ctx, {
			salesId: 44,
			salesRepId: 3,
			reason: null,
			password: "owner-pass",
		});

		expect(result.changed).toBe(true);
		expect(calls.some((call) => call.name === "salesOrders.update")).toBe(true);
	});

	test("rejects a sales rep transfer for an order they do not own", async () => {
		const { ctx, calls } = buildTransferContext({
			actorId: 4,
			actorName: "Other Rep",
			actorRole: "Sales Rep",
			currentSalesRepId: 2,
			passwordHash: await hashPassword("other-pass"),
		});

		await expect(
			transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: null,
				password: "other-pass",
			}),
		).rejects.toThrow("You can only transfer orders assigned to you.");
		expect(calls).toEqual([]);
	});

	test("rejects transfer when password confirmation fails", async () => {
		const { ctx, calls } = buildTransferContext({
			passwordHash: await hashPassword("confirm-pass"),
		});

		await expect(
			transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: null,
				password: "wrong-pass",
			}),
		).rejects.toThrow("Password confirmation failed.");
		expect(calls).toEqual([]);
	});

	test("does not write history when the selected rep is already assigned", async () => {
		const { ctx, calls } = buildTransferContext({
			currentSalesRepId: 3,
			targetSalesRepId: 3,
			passwordHash: await hashPassword("confirm-pass"),
		});

		const result = await transferSalesRep(ctx, {
			salesId: 44,
			salesRepId: 3,
			reason: null,
			password: "confirm-pass",
		});

		expect(result.changed).toBe(false);
		expect(calls).toEqual([]);
	});

	test("allows an owner rep to load transfer options for their own order", async () => {
		const { ctx } = buildTransferContext({
			actorId: 2,
			actorName: "Original Rep",
			actorRole: "Sales Rep",
			currentSalesRepId: 2,
			passwordHash: await hashPassword("owner-pass"),
		});

		const options = await getSalesRepTransferOptions(ctx, { salesId: 44 });

		expect(options.map((option) => option.name)).toEqual([
			"Actual Rep",
			"Original Rep",
		]);
	});
});
