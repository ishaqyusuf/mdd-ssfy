import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const productionDocumentSource = readFileSync(
	new URL("./production/v2/production-item-document.tsx", import.meta.url),
	"utf8",
);

describe("Production create action availability", () => {
	test("places the admin create control beside the assignment total", () => {
		assert.match(productionDocumentSource, /const createButton = \(/);
		assert.match(productionDocumentSource, /createTriggerRef/);
		assert.match(
			productionDocumentSource,
			/<ProductionAssignmentForm closeForm=\{closeCreateForm\} \/>/,
		);
		assert.match(
			productionDocumentSource,
			/<Badge variant="secondary">[\s\S]*?createButtonWithTooltip/,
		);
	});

	test("moves the disabled reason from the page alert into an accessible tooltip", () => {
		assert.match(productionDocumentSource, /<TooltipTrigger asChild>/);
		assert.match(
			productionDocumentSource,
			/aria-label=\{`Create unavailable: \$\{createDisabledReason\}`\}/,
		);
		assert.match(productionDocumentSource, /aria-disabled="true"/);
		assert.match(productionDocumentSource, /<TooltipContent[^>]+side="bottom"/);
		assert.match(
			productionDocumentSource,
			/<p className="font-medium">Create unavailable<\/p>/,
		);
		assert.doesNotMatch(
			productionDocumentSource,
			/<AlertTitle>Create unavailable<\/AlertTitle>/,
		);
	});

	test("keeps material review silent in the create area", () => {
		assert.doesNotMatch(productionDocumentSource, /Material verification/);
	});
});
