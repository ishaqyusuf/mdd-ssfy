import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { requireInventoryImportOperator } from "./inventory-import-permissions";

function context(
	userId: number | undefined,
	roleNames: string[],
	options: { deletedAt?: Date | null; accessRevokedAt?: Date | null } = {},
) {
	return {
		userId,
		db: {
			users: {
				findFirst: async () =>
					userId
						? {
								id: userId,
								name: "Inventory Operator",
								deletedAt: options.deletedAt ?? null,
								accessRevokedAt: options.accessRevokedAt ?? null,
								roles: roleNames.map((name) => ({
									role: { name },
								})),
							}
						: null,
			},
		},
	} as unknown as TRPCContext;
}

describe("inventory import operator permission", () => {
	it("accepts Super Admin even when it is not the first assigned role", async () => {
		const actor = await requireInventoryImportOperator(
			context(42, ["Sales Team", "Super Admin"]),
		);

		expect(actor).toMatchObject({
			id: 42,
			name: "Inventory Operator",
		});
	});

	it("rejects an authenticated non-Super-Admin actor", async () => {
		await expect(
			requireInventoryImportOperator(context(42, ["Admin"])),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("rejects an anonymous request", async () => {
		await expect(
			requireInventoryImportOperator(context(undefined, [])),
		).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});
});
