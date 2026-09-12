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
});
