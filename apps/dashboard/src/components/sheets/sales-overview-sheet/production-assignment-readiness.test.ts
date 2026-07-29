import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const itemMenuSource = readFileSync(
	new URL("./production-item-menu.tsx", import.meta.url),
	"utf8",
);
const readinessBannerSource = readFileSync(
	new URL("./production-readiness-banner.tsx", import.meta.url),
	"utf8",
);
const productionTabSource = readFileSync(
	new URL("./production-tab.tsx", import.meta.url),
	"utf8",
);
const productionContextSource = readFileSync(
	new URL("./context.tsx", import.meta.url),
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
		assert.doesNotMatch(itemMenuSource, /productionReadiness\.queryOptions/);
		assert.doesNotMatch(itemMenuSource, /Inventory confirmation required/);
		assert.match(readinessBannerSource, /Production assignment is available/);
		assert.match(readinessBannerSource, /open inbound/);
		assert.match(productionDetailSource, /ProductionMaterialsNotice/);
		assert.match(materialsStatusSource, /Expected/);
		assert.match(productionColumnsSource, /Materials pending/);
		assert.match(productionColumnsSource, /Expected/);
	});

	it("shows and loads readiness only when actual production lines exist", () => {
		assert.match(
			productionTabSource,
			/itemCount > 0 \? <ProductionReadinessBanner \/> : null/,
		);
		assert.match(
			productionContextSource,
			/getProductionTabItemCount\(data\?\.items\) > 0/,
		);
		assert.match(
			productionContextSource,
			/enabled: Boolean\(data\?\.orderId && hasProductionItems\)/,
		);
	});
});
