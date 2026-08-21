import { describe, expect, it } from "bun:test";
import { assertCanSetSalesPaymentDate } from "./sales-payment-date-access";

function contextFor(roleNames: string[], options?: { userExists?: boolean }) {
	let queries = 0;
	return {
		ctx: {
			userId: 41,
			db: {
				users: {
					findFirst: async () => {
						queries += 1;
						return options?.userExists === false
							? null
							: {
									roles: roleNames.map((name) => ({ role: { name } })),
								};
					},
				},
			},
		} as never,
		getQueries: () => queries,
	};
}

describe("sales payment date access", () => {
	it("does not query roles when no manual date was submitted", async () => {
		const { ctx, getQueries } = contextFor(["Sales"]);

		await assertCanSetSalesPaymentDate(ctx, null);

		expect(getQueries()).toBe(0);
	});

	it("accepts a manual date for an active Super Admin", async () => {
		const { ctx } = contextFor(["Sales", "Super Admin"]);

		await expect(
			assertCanSetSalesPaymentDate(ctx, "2026-08-14"),
		).resolves.toBeUndefined();
	});

	it("rejects a forged manual date from other or missing users", async () => {
		const salesUser = contextFor(["Sales"]);
		const missingUser = contextFor([], { userExists: false });

		await expect(
			assertCanSetSalesPaymentDate(salesUser.ctx, "2026-08-14"),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			assertCanSetSalesPaymentDate(missingUser.ctx, "2026-08-14"),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
