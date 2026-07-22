import { describe, expect, test } from "bun:test";

import {
	clearMasterPasswordLoginAudits,
	listMasterPasswordLoginAudits,
} from "./master-password-login-audits";

function buildContext(roleName = "Super Admin") {
	const calls: Array<{ name: string; payload: unknown }> = [];
	const ctx = {
		userId: 1,
		db: {
			users: {
				findFirst: async () => ({
					id: 1,
					name: "Admin User",
					email: "admin@example.com",
					roles: [{ role: { name: roleName } }],
				}),
			},
			masterPasswordLoginAudit: {
				findMany: async (payload: unknown) => {
					calls.push({ name: "findMany", payload });
					return [];
				},
				count: async (payload: unknown) => {
					calls.push({ name: "count", payload });
					return 0;
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "updateMany", payload });
					return { count: 2 };
				},
			},
		},
	} as unknown as Parameters<typeof listMasterPasswordLoginAudits>[0];

	return { calls, ctx };
}

describe("master password usage audits", () => {
	test("filters and searches transfer usage by sale reference", async () => {
		const { calls, ctx } = buildContext();

		await listMasterPasswordLoginAudits(ctx, {
			q: "Q04780AD",
			usageType: "SALES_REP_TRANSFER",
			platform: "WEBSITE",
		});

		expect(calls.find((call) => call.name === "findMany")).toMatchObject({
			payload: {
				where: {
					deletedAt: null,
					clearedAt: null,
					usageType: "SALES_REP_TRANSFER",
					platform: "WEBSITE",
					OR: expect.arrayContaining([
						{ resourceId: { contains: "Q04780AD" } },
					]),
				},
			},
		});
	});

	test("searches by the human-readable usage label", async () => {
		const { calls, ctx } = buildContext();

		await listMasterPasswordLoginAudits(ctx, {
			q: "Sales rep transfer",
		});

		expect(calls.find((call) => call.name === "findMany")).toMatchObject({
			payload: {
				where: {
					OR: expect.arrayContaining([
						{ usageType: "SALES_REP_TRANSFER" },
					]),
				},
			},
		});
	});

	test("preserves the usage filter when clearing current results", async () => {
		const { calls, ctx } = buildContext();

		await clearMasterPasswordLoginAudits(ctx, {
			usageType: "SALES_REP_TRANSFER",
			platform: "WEBSITE",
		});

		expect(calls.find((call) => call.name === "updateMany")).toMatchObject({
			payload: {
				where: {
					deletedAt: null,
					clearedAt: null,
					usageType: "SALES_REP_TRANSFER",
					platform: "WEBSITE",
				},
				data: {
					clearedBySuperAdminId: 1,
				},
			},
		});
	});

	test("keeps usage review Super Admin-only", async () => {
		const { ctx } = buildContext("Sales Rep");

		await expect(listMasterPasswordLoginAudits(ctx, {})).rejects.toThrow(
			"Only Super Admin can access master password login audits.",
		);
	});
});
