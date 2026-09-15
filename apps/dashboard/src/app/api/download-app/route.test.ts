import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "route.ts"),
	"utf8",
);

describe("mobile app download authorization", () => {
	it("requires an authenticated active employee with approved Android access", () => {
		expect(source).toContain("getWebAuthSession(req.headers)");
		expect(source).toContain('platform: "ANDROID"');
		expect(source).toContain(
			'status: { in: ["INVITED", "ACCEPTED", "INSTALLED"] }',
		);
		expect(source).toContain("getActiveCompanyMemberWhere({ id: userId })");
		expect(source).toContain(
			"where: activeCompanyRoleAssignmentWhere",
		);
	});

	it("does not accept a caller-controlled download URL or filename", () => {
		expect(source).not.toContain('searchParams.get("url")');
		expect(source).not.toContain('searchParams.get("name")');
	});

	it("does not honor a deleted Super Admin role", () => {
		expect(source).toContain("where: activeCompanyRoleAssignmentWhere");
	});
});
