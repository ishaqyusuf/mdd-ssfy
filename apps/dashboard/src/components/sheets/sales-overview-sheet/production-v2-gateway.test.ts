import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const controllerSource = readFileSync(
	new URL("./controller.tsx", import.meta.url),
	"utf8",
);
const gatewaySource = readFileSync(
	new URL("./production/production-tab-gateway.tsx", import.meta.url),
	"utf8",
);
const productionV2Source = readFileSync(
	new URL("./production/v2/production-tab-v2.tsx", import.meta.url),
	"utf8",
);
const productionDocumentSource = readFileSync(
	new URL("./production/v2/production-item-document.tsx", import.meta.url),
	"utf8",
);
const legacyDetailSource = readFileSync(
	new URL("./production-item-detail.tsx", import.meta.url),
	"utf8",
);
const expansionSource = readFileSync(
	new URL("./use-production-item-expansion.ts", import.meta.url),
	"utf8",
);

test("routes every Production surface through the V2 gateway", () => {
	expect(controllerSource).toContain(
		'import { ProductionTabGateway } from "./production/production-tab-gateway";',
	);
	expect(controllerSource.match(/<ProductionTabGateway \/>/g)).toHaveLength(3);
	expect(controllerSource).not.toContain("<ProductionTab />");
});

test("keeps Production V2 lazy and the legacy Production tab as fallback", () => {
	expect(gatewaySource).toContain('import("./v2/production-tab-v2")');
	expect(gatewaySource).toContain('generalViewVersion === "v2"');
	expect(gatewaySource).toContain("return <ProductionTab />");
});

test("renders the approved single-view command document in order", () => {
	const sections = [
		"ProductionV2CreateAction",
		"ProductionV2RecordsSection",
		"ProductionV2DetailsSection",
		"ProductionV2NotesSection",
	];
	const offsets = sections.map((section) =>
		productionDocumentSource.indexOf(section),
	);

	expect(offsets.every((offset) => offset >= 0)).toBe(true);
	expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
	expect(productionDocumentSource).not.toContain("TabsTrigger");
	expect(productionDocumentSource).not.toContain("prod-item-tab");
});

test("uses the Midday content split and shadcn composition primitives", () => {
	expect(productionV2Source).toContain(
		'import { ProductionV2ItemDocument } from "./production-item-document";',
	);
	expect(productionDocumentSource).toContain("<ItemGroup>");
	expect(productionDocumentSource).toContain("<SelectGroup>");
	expect(productionDocumentSource).toContain('<Alert variant="warning"');
	expect(productionDocumentSource).toContain("<Empty");
	expect(productionDocumentSource).toContain("<Separator />");
	expect(productionDocumentSource).not.toMatch(/space-[xy]-/);
});

test("keeps exactly one V2 production item open and restores it from the URL", () => {
	expect(productionV2Source).toContain('type="single"');
	expect(productionV2Source).toContain("singleOpen: true");
	expect(productionV2Source).toContain("onValueChange={(itemUid) =>");
	expect(productionV2Source).not.toContain('type="multiple"');
});

test("preserves role actions, mutation surfaces, and legacy compatibility", () => {
	expect(productionDocumentSource).toContain(
		'workerMode ? "Create submission" : "Create assignment"',
	);
	expect(productionDocumentSource).toContain("<ProductionAssignmentForm");
	expect(productionDocumentSource).toContain("<ProductionSubmitForm");
	expect(productionDocumentSource).toContain("<ProductionAssignmentRow");
	expect(productionDocumentSource).toContain(
		'noteTagFilter("itemControlUID", item.controlUid)',
	);
	expect(productionDocumentSource).toContain(
		'noteTagFilter("salesItemId", item.itemId)',
	);
	expect(productionDocumentSource).toContain(
		'noteTagFilter("salesId", item.salesId)',
	);
	expect(expansionSource).toContain("itemUids.slice(0, 1)");
	expect(productionV2Source).toContain('<ItemTitle className="uppercase">');
	expect(productionV2Source).toContain(
		'<ItemDescription className="uppercase">',
	);
	expect(productionV2Source).toContain(
		"<ProductionItemStatusBadges item={item} />",
	);
	expect(productionV2Source).not.toContain("ItemProgressBar");
	expect(legacyDetailSource).toContain("TabsTrigger");
});

test("keeps empty assignment and submission sections compact", () => {
	expect(productionDocumentSource).toContain('`${data?.assignments?.length || 0} total`');
	expect(productionDocumentSource).not.toContain(
		"Create the first assignment for this production item.",
	);
	expect(productionDocumentSource).not.toContain(
		"No submission assignment is available for this item.",
	);
});
