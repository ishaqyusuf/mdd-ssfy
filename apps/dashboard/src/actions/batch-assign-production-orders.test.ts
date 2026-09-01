import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./batch-assign-production-orders.ts", import.meta.url),
	"utf8",
);
const directAssignmentSource = readFileSync(
	new URL("./create-sales-assignment.ts", import.meta.url),
	"utf8",
);
const legacyAssignmentSource = readFileSync(
	new URL(
		"../app/(clean-code)/(sales)/_common/data-actions/production-actions/item-assign-action.ts",
		import.meta.url,
	),
	"utf8",
);
const dataAccessSources = [
	"../app/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
	"../app-deps/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("batch production assignment", () => {
	it("does not depend on inventory lifecycle synchronization", () => {
		assert.doesNotMatch(source, /syncInventoryProductionLifecycleForSale/);
		assert.doesNotMatch(
			directAssignmentSource,
			/syncInventoryProductionLifecycleForSale/,
		);
		const legacyCreateAssignment = legacyAssignmentSource.slice(
			legacyAssignmentSource.indexOf("createItemAssignmentAction"),
			legacyAssignmentSource.indexOf("deleteItemAssignmentAction"),
		);
		assert.doesNotMatch(
			legacyCreateAssignment,
			/syncInventoryProductionLifecycleForSale/,
		);
		for (const dataAccessSource of dataAccessSources) {
			const createAssignment = dataAccessSource.slice(
				dataAccessSource.indexOf("createItemAssignmentDta"),
				dataAccessSource.indexOf("deleteAssignmentDta"),
			);
			assert.doesNotMatch(
				createAssignment,
				/syncInventoryProductionLifecycleForSale/,
			);
		}
	});

	it("returns Warning Only metadata to the production UI", () => {
		assert.match(source, /attachSpecialOrderOperationFeedback/);
		assert.match(source, /operationalDecisions\.push/);
		const productionUiSource = readFileSync(
			new URL("../components/production-v2/shared.tsx", import.meta.url),
			"utf8",
		);
		assert.match(productionUiSource, /getSpecialOrderOperationWarnings/);
		assert.match(productionUiSource, /formatSpecialOrderOperationWarning/);
	});

	it("targets the assigned worker with an in-app notification", () => {
		for (const assignmentSource of [source, directAssignmentSource]) {
			assert.match(assignmentSource, /sales_production_assigned/);
			assert.match(assignmentSource, /ids: \[[^\]]*assignedToId[^\]]*\]/);
			assert.match(assignmentSource, /includeChannelSubscribers: false/);
			assert.match(assignmentSource, /forceInAppRecipients: true/);
		}
	});
});
