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
	it("uses the shared material action instead of an extra review stage in Production", () => {
		expect(productionTabSource).toContain("<ProductionMaterialActions");
		expect(productionTabSource).toContain("salesOrderId={data.orderId}");
		expect(productionTabSource).not.toContain("<ProductionMaterialReviewPanel");
		expect(reviewPanelSource).toContain("const showReviewQueue = !orderContext");
	});

	it("opens the exact review referenced by the notification", () => {
		expect(notificationCenterSource).toContain("reviewId=${encodeURIComponent");
		expect(reviewPanelSource).toContain("requestedReviewId");
	});
});
