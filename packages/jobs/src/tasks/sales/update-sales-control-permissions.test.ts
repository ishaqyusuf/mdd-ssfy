import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./update-sales-control.ts", import.meta.url),
).text();

describe("update-sales-control permissions", () => {
	it("rechecks and sanitizes every task actor before resolving a write", () => {
		expect(source).toContain("salesControlTaskPermissionKeys.map");
		expect(source).toContain("userHasPermission(");
		expect(source).toContain("authorizeSalesControlTaskInput(");
		expect(source).toContain(
			"const authorizedInput = await authorizeTaskInput",
		);
		expect(source).toContain("resolveActionHandler(authorizedInput)");
		expect(source.indexOf("userHasPermission(")).toBeLessThan(
			source.indexOf("await enforceSpecialOrderForAction"),
		);
		expect(source).toContain("runSalesPipelineCommandTransaction(");
		expect(source).toContain(
			"expectedRevision: authorizedInput.meta.pipelineRevision",
		);
		expect(source).toContain(
			"await enforceSpecialOrderForAction(transactionDb, authorizedInput)",
		);
		expect(source).toContain("await action(transactionDb, authorizedInput)");
		expect(source.indexOf("runSalesPipelineCommandTransaction(")).toBeLessThan(
			source.indexOf("await action(transactionDb, authorizedInput)"),
		);
		expect(source).toContain('projectionRefresh: "failed" as const');
	});

	it("delivers pending material review alerts directly to the order sales rep", () => {
		const helperStart = source.indexOf(
			"async function sendProductionMaterialReviewNotification",
		);
		const helper = source.slice(helperStart, helperStart + 3200);

		expect(helper).toContain("new Notifications(db)");
		expect(helper).toContain("getActionablePendingReviewIds(db");
		expect(helper).toContain("if (!currentActionability) return");
		expect(helper).toContain("review.order.salesRepId");
		expect(helper).toContain(
			"classification: currentActionability.actionability.classification",
		);
		expect(helper).toContain("evidenceRevision: review.materialRevision");
		expect(helper).toContain("forceInAppRecipients: true");
		expect(helper).toContain("includeChannelSubscribers: false");
	});

	it("delivers production lifecycle alerts directly to the named people", () => {
		const assignedStart = source.indexOf(
			"async function sendProductionAssignedNotification",
		);
		const assigned = source.slice(assignedStart, assignedStart + 2600);

		expect(assigned).toContain("new Notifications(db)");
		expect(assigned).toContain("forceInAppRecipients: true");
		expect(assigned).toContain("includeChannelSubscribers: false");
		expect(source).toContain('"sales_production_unassigned"');
		expect(source).toContain('"sales_production_submitted"');
	});

	it("does not fail an already committed command when a notification fails", () => {
		expect(source).toContain(
			"Sales control committed, but its packed notification failed.",
		);
		expect(source).toContain(
			"Sales control committed, but its completed notification failed.",
		);
	});
});
