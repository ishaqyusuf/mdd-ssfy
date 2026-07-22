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

function restoreMasterPassword(value: string | undefined) {
	if (value === undefined) {
		// biome-ignore lint/performance/noDelete: Restore process environment state precisely between tests.
		delete process.env.NEXT_BACK_DOOR_TOK;
		return;
	}

	process.env.NEXT_BACK_DOOR_TOK = value;
}

function buildTransferContext({
	actorId = 1,
	actorName = "Admin User",
	actorRole = "Super Admin",
	currentSalesRepId = 2,
	targetSalesRepId = 3,
	targetRole = "Sales Rep",
	saleType = "order",
	passwordHash = "",
	masterPasswordAuditError,
}: {
	actorId?: number;
	actorName?: string;
	actorRole?: string;
	currentSalesRepId?: number | null;
	targetSalesRepId?: number;
	targetRole?: string;
	saleType?: "order" | "quote";
	passwordHash?: string | null;
	masterPasswordAuditError?: Error;
} = {}) {
	const actor = buildUser(actorId, actorName, actorRole, passwordHash);
	const target =
		targetSalesRepId === actor.id
			? actor
			: buildUser(targetSalesRepId, "Actual Rep", targetRole);
	const users = new Map<number, ReturnType<typeof buildUser>>([
		[actor.id, actor],
		[target.id, target],
	]);
	const calls: Array<{ name: string; payload: unknown }> = [];
	const transactionCalls: Array<{ name: string; payload: unknown }> = [];
	const attempts: Array<{ name: string; payload: unknown }> = [];
	const tx = {
		users: {
			findFirst: async ({ where }: { where: { id: number } }) =>
				users.get(where.id) ?? null,
			findMany: async () => Array.from(users.values()),
		},
		salesOrders: {
			findFirst: async ({
				where,
			}: {
				where: { type?: string | { in?: string[] } };
			}) => {
				const allowedTypes =
					typeof where.type === "string"
						? [where.type]
						: (where.type?.in ?? []);
				if (!allowedTypes.includes(saleType)) return null;

				return {
					id: 44,
					orderId: saleType === "quote" ? "Q04780AD" : "04780AD",
					slug: saleType === "quote" ? "q04780ad" : "04780ad",
					type: saleType,
					salesRepId: currentSalesRepId,
					salesRep: currentSalesRepId
						? {
								id: currentSalesRepId,
								name: "Original Rep",
								email: "original.rep@example.com",
							}
						: null,
				};
			},
			update: async (payload: unknown) => {
				transactionCalls.push({ name: "salesOrders.update", payload });
				return { id: 44 };
			},
		},
		salesHistory: {
			create: async (payload: unknown) => {
				transactionCalls.push({ name: "salesHistory.create", payload });
				return { id: "history-id" };
			},
		},
		masterPasswordLoginAudit: {
			create: async (payload: unknown) => {
				const call = { name: "masterPasswordLoginAudit.create", payload };
				attempts.push(call);
				transactionCalls.push(call);
				if (masterPasswordAuditError) throw masterPasswordAuditError;
				return { id: "master-password-audit-id" };
			},
		},
	};

	return {
		attempts,
		calls,
		ctx: {
			userId: actor.id,
			requestId: "transfer-request-id",
			userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36",
			ipAddress: "203.0.113.10",
			countryCode: "US",
			db: {
				...tx,
				modelHasPermissions: {
					findMany: async () => [],
				},
				$transaction: async (callback: (client: typeof tx) => unknown) => {
					try {
						const result = await callback(tx);
						calls.push(...transactionCalls);
						return result;
					} catch (error) {
						transactionCalls.length = 0;
						throw error;
					}
				},
			},
		} as unknown as Parameters<typeof transferSalesRep>[0],
	};
}

describe("transferSalesRep", () => {
	test("updates an owned order sales rep and writes sales history", async () => {
		const { ctx, calls } = buildTransferContext({
			actorId: 2,
			actorName: "Original Rep",
			actorRole: "Sales Rep",
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
					authorName: "Original Rep",
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
						triggeredByUserId: 2,
					},
				},
			},
		});
		expect(
			calls.some((call) => call.name === "masterPasswordLoginAudit.create"),
		).toBe(false);
	});

	test("accepts a master password and records owned order usage", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-transfer-pass";

		try {
			const { ctx, calls } = buildTransferContext({
				actorId: 2,
				actorName: "Original Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 2,
				passwordHash: null,
			});

			const result = await transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: "Owner approved handoff",
				password: "master-transfer-pass",
			});

			expect(result.changed).toBe(true);
			expect(
				calls.find((call) => call.name === "masterPasswordLoginAudit.create"),
			).toMatchObject({
				name: "masterPasswordLoginAudit.create",
				payload: {
					data: {
						usageType: "SALES_REP_TRANSFER",
						targetUserId: 2,
						targetUserName: "Original Rep",
						targetUserEmail: "original.rep@example.com",
						appSurface: "www",
						platform: "WEBSITE",
						ipAddress: "203.0.113.10",
						countryCode: "US",
						requestId: "transfer-request-id",
						resourceType: "order",
						resourceId: "04780AD",
					},
				},
			});
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
	});

	test("records quote context when a master password transfers an owned quote", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-quote-pass";

		try {
			const { ctx, calls } = buildTransferContext({
				actorId: 2,
				actorName: "Original Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 2,
				saleType: "quote",
				passwordHash: null,
			});

			await transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: null,
				password: "master-quote-pass",
			});

			expect(
				calls.find((call) => call.name === "masterPasswordLoginAudit.create"),
			).toMatchObject({
				payload: {
					data: {
						resourceType: "quote",
						resourceId: "Q04780AD",
					},
				},
			});
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
	});

	test("rejects and surfaces an audit failure for a master-password transfer", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-audit-pass";

		try {
			const { ctx, calls, attempts } = buildTransferContext({
				actorId: 2,
				actorName: "Original Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 2,
				passwordHash: null,
				masterPasswordAuditError: new Error("audit unavailable"),
			});

			await expect(
				transferSalesRep(ctx, {
					salesId: 44,
					salesRepId: 3,
					reason: null,
					password: "master-audit-pass",
				}),
			).rejects.toThrow("audit unavailable");
			expect(calls).toEqual([]);
			expect(
				attempts.some(
					(call) => call.name === "masterPasswordLoginAudit.create",
				),
			).toBe(true);
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
	});

	test("allows a sales rep to transfer a quote assigned to them", async () => {
		const { ctx, calls } = buildTransferContext({
			actorId: 2,
			actorName: "Original Rep",
			actorRole: "Sales Rep",
			currentSalesRepId: 2,
			saleType: "quote",
			passwordHash: await hashPassword("owner-pass"),
		});

		const result = await transferSalesRep(ctx, {
			salesId: 44,
			salesRepId: 3,
			reason: "Handing off quote",
			password: "owner-pass",
		});

		expect(result.changed).toBe(true);
		expect(result.order.orderId).toBe("Q04780AD");
		expect(calls.some((call) => call.name === "salesOrders.update")).toBe(true);
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
		).rejects.toThrow("You can only transfer sales assigned to you.");
		expect(calls).toEqual([]);
	});

	test("master password cannot transfer another rep's sale", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-owner-only-pass";

		try {
			const { ctx, calls } = buildTransferContext({
				actorId: 4,
				actorName: "Other Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 2,
				passwordHash: null,
			});

			await expect(
				transferSalesRep(ctx, {
					salesId: 44,
					salesRepId: 3,
					reason: null,
					password: "master-owner-only-pass",
				}),
			).rejects.toThrow("You can only transfer sales assigned to you.");
			expect(calls).toEqual([]);
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
	});

	test("invalid master-password transfer targets create no audit", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-invalid-target-pass";

		try {
			const { ctx, calls, attempts } = buildTransferContext({
				actorId: 2,
				actorName: "Original Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 2,
				targetRole: "Viewer",
				passwordHash: null,
			});

			await expect(
				transferSalesRep(ctx, {
					salesId: 44,
					salesRepId: 3,
					reason: null,
					password: "master-invalid-target-pass",
				}),
			).rejects.toThrow("Select an active sales user.");
			expect(calls).toEqual([]);
			expect(attempts).toEqual([]);
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
	});

	test("rejects editOrders users when they do not own the sale", async () => {
		const { ctx, calls } = buildTransferContext({
			actorId: 1,
			actorName: "Admin User",
			actorRole: "Super Admin",
			currentSalesRepId: 2,
			passwordHash: await hashPassword("admin-pass"),
		});

		await expect(
			transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: null,
				password: "admin-pass",
			}),
		).rejects.toThrow("You can only transfer sales assigned to you.");
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

	test("unchanged master-password assignments create no history or audit", async () => {
		const previousMasterPassword = process.env.NEXT_BACK_DOOR_TOK;
		process.env.NEXT_BACK_DOOR_TOK = "master-unchanged-pass";

		try {
			const { ctx, calls, attempts } = buildTransferContext({
				actorId: 3,
				actorName: "Actual Rep",
				actorRole: "Sales Rep",
				currentSalesRepId: 3,
				targetSalesRepId: 3,
				passwordHash: null,
			});

			const result = await transferSalesRep(ctx, {
				salesId: 44,
				salesRepId: 3,
				reason: null,
				password: "master-unchanged-pass",
			});

			expect(result.changed).toBe(false);
			expect(calls).toEqual([]);
			expect(attempts).toEqual([]);
		} finally {
			restoreMasterPassword(previousMasterPassword);
		}
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

	test("allows an owner rep to load transfer options for their own quote", async () => {
		const { ctx } = buildTransferContext({
			actorId: 2,
			actorName: "Original Rep",
			actorRole: "Sales Rep",
			currentSalesRepId: 2,
			saleType: "quote",
			passwordHash: await hashPassword("owner-pass"),
		});

		const options = await getSalesRepTransferOptions(ctx, { salesId: 44 });

		expect(options.map((option) => option.name)).toEqual([
			"Actual Rep",
			"Original Rep",
		]);
	});

	test("rejects transfer options for editOrders users who do not own the sale", async () => {
		const { ctx } = buildTransferContext({
			actorId: 1,
			actorName: "Admin User",
			actorRole: "Super Admin",
			currentSalesRepId: 2,
		});

		await expect(
			getSalesRepTransferOptions(ctx, { salesId: 44 }),
		).rejects.toThrow("You can only transfer sales assigned to you.");
	});
});
