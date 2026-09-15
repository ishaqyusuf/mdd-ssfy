import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(
	`${import.meta.dir}/mobile-access.route.ts`,
	"utf8",
);
const appRouterSource = readFileSync(
	`${import.meta.dir}/_app.ts`,
	"utf8",
);
const apiEntrySource = readFileSync(
	`${import.meta.dir}/../../index.ts`,
	"utf8",
);
const internalApiSource = readFileSync(
	`${import.meta.dir}/../../internal-api.ts`,
	"utf8",
);
const dashboardHandlerSource = readFileSync(
	`${import.meta.dir}/../../../../dashboard/src/app/api/trpc/[...trpc]/route.ts`,
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
	it("wires the protected mobile-access router into the dashboard API handler", () => {
		expect(routerSource).toContain("myRequests: protectedProcedure.query");
		expect(appRouterSource).toContain('import { mobileAccessRouter } from "./mobile-access.route"');
		expect(appRouterSource).toContain("mobileAccess: mobileAccessRouter");
		expect(apiEntrySource).toContain('import { appRouter } from "./trpc/routers/_app"');
		expect(apiEntrySource).toContain("router: appRouter");
		expect(internalApiSource).toContain('import { app } from "."');
		expect(dashboardHandlerSource).toContain('export * from "@api/internal-api"');
	});

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
