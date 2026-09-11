import { expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { requireSalesRequestSettingsAdmin } from "./sales-request-permissions";

function context(names: string[], userId: number | undefined = 7) {
	const calls: unknown[] = [];
	const ctx = {
		userId,
		db: {
			users: {
				findFirst: async (query: unknown) => {
					calls.push(query);
					return { roles: names.map((name) => ({ role: { name } })) };
				},
			},
		},
	} as unknown as TRPCContext;
	return { ctx, calls };
}

test("checks active actor and accepts Super Admin in any role position", async () => {
	const { ctx, calls } = context(["Sales", "Super Admin"]);
	await requireSalesRequestSettingsAdmin(ctx);
	expect(calls[0]).toMatchObject({
		where: { id: 7, deletedAt: null, accessRevokedAt: null },
		select: {
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
			},
		},
	});
});

test("ordinary sales roles cannot edit defaults", async () => {
	await expect(
		requireSalesRequestSettingsAdmin(context(["Sales"]).ctx),
	).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("a soft-deleted Super Admin role cannot edit defaults", async () => {
	const ctx = {
		userId: 7,
		db: {
			users: {
				findFirst: async () => ({
					roles: [
						{
							role: {
								name: "Super Admin",
								deletedAt: new Date("2026-01-01"),
							},
						},
					],
				}),
			},
		},
	} as unknown as TRPCContext;

	await expect(requireSalesRequestSettingsAdmin(ctx)).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
});

test("unauthenticated callers perform no actor lookup", async () => {
	const { ctx, calls } = context([]);
	ctx.userId = undefined;
	await expect(requireSalesRequestSettingsAdmin(ctx)).rejects.toMatchObject({
		code: "UNAUTHORIZED",
	});
	expect(calls).toEqual([]);
});
