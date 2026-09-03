import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales.route.ts", import.meta.url),
	"utf8",
);

describe("production material review permissions", () => {
	it("allows authorized viewers to inspect reviews with explicit capabilities", () => {
		for (const routeName of [
			"productionSubmissionMaterialReviews: protectedProcedure",
			"productionSubmissionMaterialReviewDetail: protectedProcedure",
		]) {
			const routeStart = source.indexOf(routeName);
			const route = source.slice(routeStart, routeStart + 1500);
			expect(route).toContain("requireProductionOverviewViewer(props.ctx)");
			expect(route).toContain("capabilities:");
			expect(route).toContain("canReview:");
			expect(route).toContain("canReceiveInbound:");
			expect(route).toContain("canMarkAvailable:");
		}
	});

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

	it("delivers the final decision directly to the submitting worker", () => {
		const mutationStart = source.indexOf(
			"reviewProductionSubmission: protectedProcedure",
		);
		const mutation = source.slice(mutationStart, mutationStart + 4200);

		expect(mutation).toContain("new Notifications(props.ctx.db)");
		expect(mutation).toContain("review.submittedBy.id");
		expect(mutation).toContain("forceInAppRecipients: true");
		expect(mutation).toContain("includeChannelSubscribers: false");
	});

	it("validates the pipeline revision in the same transaction as the decision", () => {
		const mutationStart = source.indexOf(
			"reviewProductionSubmission: protectedProcedure",
		);
		const mutation = source.slice(mutationStart, mutationStart + 6500);

		expect(mutation).toContain("runSalesPipelineCommandTransaction(");
		expect(mutation).toContain('action: "production.review.resolve"');
		expect(mutation).toContain(
			"expectedRevision: props.input.pipelineRevision",
		);
		expect(mutation).toContain("executeOnReplay: true");
		expect(mutation).toContain(
			"decideProductionSubmissionMaterialReview(transactionDb, props.input",
		);
		expect(mutation).toContain(
			"Production material review committed, but follow-up projection refresh failed.",
		);
	});
});
