import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./task-trigger.route.ts", import.meta.url),
).text();

describe("task trigger boundary", () => {
	it("requires authentication before task starts", () => {
		expect(source).toMatch(/trigger:\s*protectedProcedure/);
		expect(source).not.toMatch(/trigger:\s*publicProcedure/);
	});

	it("allows only update-sales-control through the generic task bridge", () => {
		expect(source).toContain(
			'const clientTaskNames = ["update-sales-control"] as const;',
		);
		expect(source).toContain("taskName: z.enum(clientTaskNames)");
		expect(source).not.toContain("run-inventory-full-import-now");
	});

	it("does not expose generic notification task execution", () => {
		expect(source).not.toMatch(/clientTaskNames\s*=\s*\[[^\]]*notification/);
		expect(source).toMatch(/notification:\s*protectedProcedure/);
		expect(source).toContain("mobileNotificationChannels.includes(");
	});

	it("keeps status retrieval behind authentication", () => {
		expect(source).toMatch(/status:\s*protectedProcedure/);
	});

	it("passes only the authenticated prepared payload to Trigger", () => {
		expect(source).toContain("userId: props.ctx.userId");
		expect(source).toContain("authorizeSalesControlTaskInput(");
		expect(source).toContain("tasks.trigger(params.taskName, payload)");
		expect(source).not.toContain(
			"tasks.trigger(params.taskName, params.payload)",
		);
	});
});
