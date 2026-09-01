import { describe, expect, test } from "bun:test";

import { salesRouter } from "./sales.route";

type SalesCallerContext = Parameters<typeof salesRouter.createCaller>[0];

function context(permissionNames: string[] = []) {
	return {
		userId: 19,
		db: {
			users: {
				findFirstOrThrow: async () => ({
					id: 19,
					email: "viewer@example.test",
					name: "Read Only User",
					phoneNo: null,
					roles: [{ role: { id: 7, name: "Read Only" } }],
				}),
			},
			roles: {
				findFirstOrThrow: async () => ({
					name: "Read Only",
					RoleHasPermissions: permissionNames.map((name) => ({
						permission: { name },
					})),
				}),
			},
			modelHasPermissions: { findMany: async () => [] },
		},
	} as unknown as SalesCallerContext;
}

const markInput = {
	salesOrderId: 91,
	requestId: "00000000-0000-4000-8000-000000000091",
	expectedRevision: "0".repeat(64),
	effectiveAt: null,
};

const cancelInput = {
	salesOrderId: 91,
	requestId: "00000000-0000-4000-8000-000000000092",
	expectedRevision: "0".repeat(64),
	reason: null,
};

describe("status-only Sales completion route permissions", () => {
	test("requires an authenticated session", async () => {
		const caller = salesRouter.createCaller({ db: {} } as SalesCallerContext);

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("rejects direct mark and cancel requests before domain access", async () => {
		const caller = salesRouter.createCaller(context());

		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelProductionCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("view capability does not authorize either mutation", async () => {
		const caller = salesRouter.createCaller(
			context(["view status only sales completion"]),
		);

		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelProductionCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("a raw snake-case row authorizes neither presentation nor editing", async () => {
		const caller = salesRouter.createCaller(
			context(["status_only_sales_completion"]),
		);

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
