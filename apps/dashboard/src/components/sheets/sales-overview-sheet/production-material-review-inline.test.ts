import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const productionTabSource = readFileSync(
	new URL("./production/v2/production-tab-v2.tsx", import.meta.url),
	"utf8",
);
const reviewPanelSource = readFileSync(
	new URL("../../production-v2/shared.tsx", import.meta.url),
	"utf8",
);
const notificationCenterSource = readFileSync(
	new URL("../../notification-center/notification-center.tsx", import.meta.url),
	"utf8",
);

describe("inline production material review", () => {
	it("shows the canonical review workflow as collapsed material attention", () => {
		expect(productionTabSource).toContain("ProductionMaterialReviewPanel");
		expect(productionTabSource).toContain("orderContext");
		expect(productionTabSource).toContain(
			'search={queryCtx.params["sales-overview-id"]}',
		);
		expect(productionTabSource).toContain("salesOrderId={data.orderId}");
		expect(productionTabSource).toContain(
			"requestedReviewId={queryCtx.params.reviewId}",
		);
		expect(reviewPanelSource).toContain("MATERIAL ATTENTION ·");
		expect(reviewPanelSource).toContain("CollapsibleTrigger asChild");
		expect(reviewPanelSource).toContain("aria-live=\"polite\"");
		expect(reviewPanelSource).toContain("Recheck material status");
		expect(reviewPanelSource).toContain("MATERIAL_REVIEW_REFRESH_INTERVAL_MS");
		expect(reviewPanelSource).toContain(
			"const showReviewQueue = !orderContext || attentionOpen",
		);
		expect(reviewPanelSource).toContain("{showReviewQueue ? (");
	});

	it("opens the exact review referenced by the notification", () => {
		expect(notificationCenterSource).toContain("reviewId=${encodeURIComponent");
		expect(reviewPanelSource).toContain("requestedReviewId");
	});
});
