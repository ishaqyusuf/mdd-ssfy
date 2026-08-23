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
const productionItemExpansionSource = readFileSync(
	new URL("./use-production-item-expansion.ts", import.meta.url),
	"utf8",
);
const productionItemDetailSource = readFileSync(
	new URL("./production-item-detail.tsx", import.meta.url),
	"utf8",
);
const productionSubmitFormSource = readFileSync(
	new URL("./production-submit-form.tsx", import.meta.url),
	"utf8",
);
const productionAssignmentRowSource = readFileSync(
	new URL("./production-assignment-row.tsx", import.meta.url),
	"utf8",
);
const productionSubmissionsSource = readFileSync(
	new URL("./production-submissions.tsx", import.meta.url),
	"utf8",
);
const salesOverviewLayoutSource = readFileSync(
	new URL("./layout.tsx", import.meta.url),
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
	it("passes the immediate submit action explicitly", () => {
		assert.match(
			itemMenuSource,
			/if \(!submitPendingAssignments\) \{\s*submitAction\("submit"\);/,
		);
	});

	it("keeps inventory and inbound status informational during assignment", () => {
		assert.doesNotMatch(itemMenuSource, /productionReadiness\.queryOptions/);
		assert.doesNotMatch(itemMenuSource, /Inventory confirmation required/);
		assert.match(readinessBannerSource, /Production assignment is available/);
		assert.match(readinessBannerSource, />Material Pending<\/h3>/);
		assert.match(readinessBannerSource, /Review Inventory/);
		assert.doesNotMatch(readinessBannerSource, /blockedComponentCount/);
		assert.match(productionDetailSource, /ProductionMaterialsNotice/);
		assert.match(materialsStatusSource, /Expected/);
		assert.match(productionColumnsSource, /Materials pending/);
		assert.doesNotMatch(productionColumnsSource, /Expected/);
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

	it("does not expose internal production item identifiers", () => {
		assert.doesNotMatch(productionTabSource, /<Env isDev>/);
	});

	it("keeps worker production focused on immediate item work", () => {
		assert.match(productionItemExpansionSource, /itemUids\.slice\(0, 1\)/);
		assert.doesNotMatch(productionItemExpansionSource, /itemUids\.length < 4/);
		assert.match(
			productionTabSource,
			/opened \? "border-2" : "border-0"/,
		);
		assert.match(productionTabSource, /opened && "border-b-0"/);
		assert.match(productionTabSource, /<ItemTitle className="uppercase">/);
		assert.match(productionTabSource, /after:absolute after:inset-0/);
		assert.match(
			productionTabSource,
			/<ItemDescription className="uppercase">/,
		);
		assert.doesNotMatch(productionTabSource, /font-mono\$|<h3/);
		assert.doesNotMatch(
			productionTabSource,
			/sbg-gradient|from-slate|bg-rose|shadow-xl/,
		);
		assert.match(
			productionTabSource,
			/workerMode \? null : <ItemProgressBar item=\{item\} \/>/,
		);
		assert.match(productionItemDetailSource, /defaultValue="details"/);
		assert.match(productionItemDetailSource, /Production item tabs/);
		assert.match(productionItemDetailSource, /productionItemTabClassName/);
		assert.match(productionItemDetailSource, /<span>Submissions<\/span>/);
		assert.match(salesOverviewLayoutSource, /!isQuote && !query\.assignedTo/);
	});

	it("keeps worker submission entry flat and reuses the Sales Form stepper", () => {
		assert.match(productionSubmitFormSource, /SalesFormQuantityStepper/);
		assert.doesNotMatch(productionSubmitFormSource, /NumberInput/);
		assert.match(
			productionAssignmentRowSource,
			/className="flex flex-col gap-4"/,
		);
		assert.match(
			productionSubmissionsSource,
			/border-border border-b py-3 text-xs last:border-b-0/,
		);
		assert.match(productionTabSource, /Toggle production item/);
	});
});
