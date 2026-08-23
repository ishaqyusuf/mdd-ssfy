import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("production submission authentication boundary", () => {
	it("replaces client author identity before dispatching the background task", () => {
		const source = readFileSync(
			new URL("./trigger-task.ts", import.meta.url),
			"utf8",
		);
		expect(source.includes('params.taskName === "update-sales-control"')).toBe(
			true,
		);
		expect(source.includes("authorId: actor.userId")).toBe(true);
		expect(source.includes("actor.can?.editProduction")).toBe(true);
		expect(source.includes("input.markAsCompleted")).toBe(true);
		expect(source.includes("actor.can?.markSalesOrderFulfilled")).toBe(true);
	});

});
