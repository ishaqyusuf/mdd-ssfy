import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(
	`${import.meta.dir}/mobile-access.route.ts`,
	"utf8",
);
const querySource = readFileSync(
	`${import.meta.dir}/../../db/queries/mobile-access.ts`,
	"utf8",
);
const adminGuardSource = readFileSync(
	`${import.meta.dir}/../../db/queries/hrm.ts`,
	"utf8",
).split("export async function requireSuperAdmin(ctx: TRPCContext)")[1]?.split(
	"export async function getEmployeePermissionOptions",
)[0];

describe("mobile access permission boundaries", () => {
	it("keeps every route authenticated", () => {
		expect(routerSource.match(/protectedProcedure/g)?.length).toBe(5);
		expect(routerSource).not.toContain("publicProcedure");
	});

	it("derives requester and reviewer identity from protected context", () => {
		expect(querySource).toContain("requireActiveEmployee(ctx)");
		expect(querySource).toContain("requireSuperAdmin(ctx)");
		expect(querySource).toContain("actorId: employee.id");
		expect(querySource).toContain("actorId: actor.id");
		expect(querySource).not.toContain("applePassword");
		expect(querySource).not.toContain("otp");
	});

	it("uses optimistic status updates and append-only events", () => {
		expect(querySource).toContain(
			"where: { id: current.id, status: current.status }",
		);
		expect(querySource).toContain("mobileAccessRequestEvent.create");
		expect(querySource).toContain("manualMobileAccessInvitationAdapter");
	});

	it("checks live account and role authority for admin review", () => {
		expect(adminGuardSource).toContain("getActiveCompanyMemberWhere({ id: ctx.userId })");
		expect(adminGuardSource).toContain("where: activeCompanyRoleAssignmentWhere");
		expect(adminGuardSource).toContain("roles.some(");
		expect(querySource).toContain(
			"where: getActiveCompanyMemberWhere({ id: ctx.userId })",
		);
		expect(querySource).toContain("...activeCompanyRoleAssignmentWhere");
		const adminList = querySource.split("export async function getMobileAccessRequestsForAdmin")[1]?.split("export async function updateMobileAccessRequest")[0];
		const adminUpdate = querySource.split("export async function updateMobileAccessRequest")[1];
		expect(adminList).toContain("await requireActiveEmployee(ctx);");
		expect(adminUpdate).toContain("await requireActiveEmployee(ctx);");
	});
});
