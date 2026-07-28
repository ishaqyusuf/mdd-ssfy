import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const itemMenuSource = readFileSync(
	new URL("./production-item-menu.tsx", import.meta.url),
	"utf8",
);
const readinessBannerSource = readFileSync(
	new URL("./production-readiness-banner.tsx", import.meta.url),
	"utf8",
);
const productionDetailSource = readFileSync(
	new URL("../../production-v2/shared.tsx", import.meta.url),
	"utf8",
);
const materialsStatusSource = readFileSync(
	new URL("../../production-v2/materials-status.tsx", import.meta.url),
	"utf8",
);
const productionColumnsSource = readFileSync(
	new URL("../../tables-2/sales-production/columns.tsx", import.meta.url),
	"utf8",
);

describe("production assignment inventory readiness", () => {
	it("keeps inventory and inbound status informational during assignment", () => {
		expect(itemMenuSource).not.toContain("productionReadiness.queryOptions");
		expect(itemMenuSource).not.toContain("Inventory confirmation required");
		expect(readinessBannerSource).toContain(
			"Production assignment is available",
		);
		expect(readinessBannerSource).toContain("open inbound");
		expect(productionDetailSource).toContain("ProductionMaterialsNotice");
		expect(materialsStatusSource).toContain("Expected");
		expect(productionColumnsSource).toContain("Materials pending");
		expect(productionColumnsSource).toContain("Expected");
	});
});
