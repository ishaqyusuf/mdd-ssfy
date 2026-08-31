import { describe, expect, it } from "bun:test";

const source = await Bun.file(new URL("./shared.tsx", import.meta.url)).text();

describe("production material review UI", () => {
	it("shows a durable retracted state for a notification-linked review", () => {
		expect(source.includes("requestedReviewId")).toBe(true);
		expect(source.includes("Submission retracted")).toBe(true);
		expect(source.includes("hasRetractedSubmissions")).toBe(true);
		expect(
			source.includes("Retracted submissions still need material resolution"),
		).toBe(true);
		expect(source.includes("refetchInterval: orderContext")).toBe(true);
	});

	it("keeps the review sidebar bounded and loads cursor pages while it scrolls", () => {
		expect(source.includes("take: 20")).toBe(true);
		expect(source.includes("calc(100dvh - 30rem")).toBe(true);
		expect(source.includes("overflow-y-auto overscroll-contain")).toBe(true);
		expect(source.includes("handleQueueScroll")).toBe(true);
		expect(source.includes("queueQuery.fetchNextPage()")).toBe(true);
		expect(
			source.includes("getNextPageParam: (lastPage) => lastPage.nextCursor"),
		).toBe(true);
	});

	it("uses the audited configuration-exception action for missing material configuration", () => {
		expect(source.includes('"APPROVE_CONFIGURATION_EXCEPTION"')).toBe(true);
		expect(source.includes("Approve confirmed availability")).toBe(true);
		expect(source.includes("does not create")).toBe(true);
	});

	it("does not treat a null component id as inventory component zero", () => {
		expect(
			source.includes(
				'typeof row.componentId === "number" ? row.componentId : null',
			),
		).toBe(true);
		expect(source.includes("componentId > 0")).toBe(true);
	});

	it("shows production item descriptions in a flat reconciliation document", () => {
		expect(source.includes("productionItemBySalesItemId")).toBe(true);
		expect(source.includes("materialReviewRows")).toBe(true);
		expect(source.includes("Material needs")).toBe(true);
		expect(source.includes("Mark needs available without inbound")).toBe(false);
		expect(source.includes('className="divide-y"')).toBe(true);
		expect(source.includes("showReviewQueue &&")).toBe(true);
	});
});
