import { describe, expect, test } from "bun:test";

import { planInboundReceiptDelta } from "./inbound-demand";

describe("planInboundReceiptDelta", () => {
	test("treats an identical receive retry as a duplicate no-op", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 10,
			previousIssueQty: 0,
			qtyReceived: 10,
		});

		expect(plan).toEqual({
			targetGoodQty: 10,
			targetIssueQty: 0,
			targetReceivedQty: 10,
			deltaGoodQty: 0,
			deltaIssueQty: 0,
			deltaReceivedQty: 0,
			duplicate: true,
		});
	});

	test("processes only the remaining good quantity on partial receive retry", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 4,
			previousIssueQty: 0,
			qtyReceived: 10,
		});

		expect(plan).toEqual({
			targetGoodQty: 10,
			targetIssueQty: 0,
			targetReceivedQty: 10,
			deltaGoodQty: 6,
			deltaIssueQty: 0,
			deltaReceivedQty: 6,
			duplicate: false,
		});
	});

	test("does not duplicate issue rows on repeated issue receive", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 8,
			previousIssueQty: 2,
			qtyReceived: 10,
			qtyIssue: 2,
		});

		expect(plan).toEqual({
			targetGoodQty: 8,
			targetIssueQty: 2,
			targetReceivedQty: 10,
			deltaGoodQty: 0,
			deltaIssueQty: 0,
			deltaReceivedQty: 0,
			duplicate: true,
		});
	});

	test("keeps existing issue quantity when completing the good remainder", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 3,
			previousIssueQty: 2,
		});

		expect(plan).toEqual({
			targetGoodQty: 8,
			targetIssueQty: 2,
			targetReceivedQty: 10,
			deltaGoodQty: 5,
			deltaIssueQty: 0,
			deltaReceivedQty: 5,
			duplicate: false,
		});
	});
});
