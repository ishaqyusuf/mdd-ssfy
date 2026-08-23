import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./dispatch.route.ts", import.meta.url),
).text();

describe("direct dispatch task actor boundary", () => {
	it("normalizes cancellation, start, and submit inputs before task execution", () => {
		expect(source).toContain("function withAuthenticatedSalesControlActor(");
		expect(source).toContain("userId: actor.id");
		expect(source).toContain("name: actor.name");
		expect(source).toContain("cancelDispatchTask(props.ctx.db, input");
		expect(source).toContain("startDispatchTask(props.ctx.db, input");
		expect(source).toContain("submitDispatchTask(props.ctx.db, input)");
	});
});
