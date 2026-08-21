import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("role permission session invalidation", () => {
	it("revokes both session types for every user assigned to a role whose permissions changed", () => {
		const source = readFileSync(
			new URL("./create-role-action.ts", import.meta.url),
			"utf8",
		);

		expect(source.includes("const permissionsToRemove")).toBe(true);
		expect(source.includes("const permissionsToAdd")).toBe(true);
		expect(source.includes("tx.modelHasRoles.findMany")).toBe(true);
		expect(source.includes("tx.session.deleteMany")).toBe(true);
		expect(source.includes("tx.webAuthSession.deleteMany")).toBe(true);
		expect(source.includes("legacyUserId: { in: userIds }")).toBe(true);
	});

	it("does not revoke sessions for a name-only role update", () => {
		const source = readFileSync(
			new URL("./create-role-action.ts", import.meta.url),
			"utf8",
		);

		expect(source.includes("existingRole &&")).toBe(true);
		expect(
			source.includes("permissionsToRemove.length || permissionsToAdd.length"),
		).toBe(true);
	});
});
