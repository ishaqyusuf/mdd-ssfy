import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales.route.ts", import.meta.url),
	"utf8",
);

describe("production material review permissions", () => {
	it("requires production permission and action-specific inventory permissions", () => {
		const helperStart = source.indexOf(
			"async function requireProductionReviewResolutionPermissions",
		);
		const helper = source.slice(helperStart, helperStart + 1700);
		expect(helper).toContain('"editInboundOrder"');
		expect(helper).toContain('"editOrders"');

		const mutationStart = source.indexOf(
			"reviewProductionSubmission: protectedProcedure",
		);
		const mutation = source.slice(mutationStart, mutationStart + 1100);
		expect(mutation).toContain("await requireProductionEditor(props.ctx)");
		expect(mutation).toContain(
			"await requireProductionReviewResolutionPermissions",
		);
	});
});
