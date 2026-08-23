import { describe, expect, test } from "bun:test";
import {
	getActiveSalesHandoffSuperAdmins,
	getSalesHandoffActorScope,
	resolveSalesHandoffOrganizationScope,
} from "./access";

describe("Sales Handoff protected organization scope", () => {
	test("rejects deleted, revoked, or otherwise inactive actors", async () => {
		const db = { users: { findFirst: async () => null } };
		expect(getSalesHandoffActorScope(db as never, 7)).rejects.toThrow(
			"not active",
		);
	});

	test("derives active Super Admin organizations server-side", async () => {
		const db = {
			users: {
				findFirst: async () => ({
					id: 7,
					roles: [
						{ organizationId: 4, role: { name: "Super Admin" } },
						{ organizationId: 2, role: { name: "Super Admin" } },
						{ organizationId: 4, role: { name: "Super Admin" } },
					],
				}),
			},
		};
		expect(await getSalesHandoffActorScope(db as never, 7)).toEqual({
			kind: "SUPER_ADMIN",
			actorUserId: 7,
			organizationIds: [2, 4],
		});
	});

	test("prefers the order organization and fails closed on ambiguous rep scope", async () => {
		const db = {
			users: {
				findFirst: async () => ({
					roles: [{ organizationId: 2 }, { organizationId: 4 }],
				}),
			},
		};
		expect(
			await resolveSalesHandoffOrganizationScope(db as never, {
				orderOrganizationId: 9,
				responsibleRepId: 17,
			}),
		).toEqual({ organizationId: 9, source: "ORDER" });
		expect(
			await resolveSalesHandoffOrganizationScope(db as never, {
				responsibleRepId: 17,
			}),
		).toEqual({ organizationId: null, source: "AMBIGUOUS" });
	});

	test("active Super Admin recipients are queried in one organization only", async () => {
		let query: unknown;
		const db = {
			users: {
				findMany: async (input: unknown) => {
					query = input;
					return [];
				},
			},
		};
		await getActiveSalesHandoffSuperAdmins(db as never, 4);
		expect(query).toMatchObject({
			where: {
				deletedAt: null,
				accessRevokedAt: null,
				roles: {
					some: {
						organizationId: 4,
						deletedAt: null,
						role: { name: "Super Admin", deletedAt: null },
					},
				},
			},
		});
	});
});
