import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { requireWorkflowComponentEditor } from "./workflow-component-access";

function createContext(permissionNames: string[]): TRPCContext {
	return {
		userId: 7,
		db: {
			users: {
				findFirstOrThrow: async () => ({
					id: 7,
					email: "sales@example.com",
					name: "Sales User",
					phoneNo: null,
					roles: [{ role: { id: 3, name: "Sales" } }],
				}),
			},
			roles: {
				findFirstOrThrow: async () => ({
					name: "Sales",
					RoleHasPermissions: permissionNames.map((name) => ({
						permission: { name },
					})),
				}),
			},
			modelHasPermissions: {
				findMany: async () => [],
			},
		} as TRPCContext["db"],
	};
}

describe("workflow component editor access", () => {
	test("rejects an authenticated user without editSalesComponent", async () => {
		await expect(
			requireWorkflowComponentEditor(createContext([])),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("allows an authenticated user with editSalesComponent", async () => {
		await expect(
			requireWorkflowComponentEditor(createContext(["editSalesComponent"])),
		).resolves.toMatchObject({ id: 7 });
	});
});
