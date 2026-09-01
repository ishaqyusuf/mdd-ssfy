import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const assignmentRowSource = readFileSync(
	new URL("./production-assignment-row.tsx", import.meta.url),
	"utf8",
);
const submissionsSource = readFileSync(
	new URL("./production-submissions.tsx", import.meta.url),
	"utf8",
);
const productionDocumentSource = readFileSync(
	new URL("./production/v2/production-item-document.tsx", import.meta.url),
	"utf8",
);
const productionTabSource = readFileSync(
	new URL("./production/v2/production-tab-v2.tsx", import.meta.url),
	"utf8",
);

describe("Production assignment Ledger Accordion", () => {
	test("uses stable assignment ids in a multiple-value shadcn accordion", () => {
		assert.match(productionDocumentSource, /type="multiple"/);
		assert.match(productionDocumentSource, /data\.assignments\[0\]\?\.id \?/);
		assert.match(
			assignmentRowSource,
			/<AccordionItem value=\{String\(assignment\.id\)\}/,
		);
		assert.match(
			productionTabSource,
			/value=\{expandedItemUids\[0\] \?\? ""\}/,
		);
	});

	test("keeps metadata and independent actions in the disclosure header", () => {
		const triggerStart = assignmentRowSource.indexOf("<AccordionTrigger");
		const triggerEnd = assignmentRowSource.indexOf(
			"</AccordionTrigger>",
			triggerStart,
		);
		const triggerSource = assignmentRowSource.slice(triggerStart, triggerEnd);

		assert.match(triggerSource, /assignedWorkerLabel/);
		assert.match(triggerSource, /Assigned by/);
		assert.match(triggerSource, /formatDate\(date/);
		assert.match(triggerSource, /AssignmentQuantityProgress/);
		assert.match(triggerSource, /actions=\{/);
		assert.match(triggerSource, /<DatePicker/);
		assert.match(triggerSource, /<ConfirmBtn/);
		assert.doesNotMatch(triggerSource, /<ProductionSubmitForm/);
		assert.doesNotMatch(triggerSource, /AssignmentStatusBadge/);
		assert.doesNotMatch(triggerSource, /submissionCount\} submission/);
	});

	test("keeps only submission creation in flat expanded content", () => {
		assert.match(assignmentRowSource, /<AccordionContent/);
		assert.match(
			assignmentRowSource,
			/<ProductionSubmitForm presentation="inline" \/>/,
		);
		assert.match(
			assignmentRowSource,
			/Submissions \(\{submittedQuantity\} of \{assignedQuantity\}\)/,
		);
		assert.match(
			assignmentRowSource,
			/<ProductionSubmissions presentation="ledger" \/>/,
		);
		assert.match(assignmentRowSource, /deleteSalesAssignmentAction/);
		assert.match(submissionsSource, /deleteSalesAssignmentSubmissionAction/);
		assert.match(submissionsSource, /presentation === "ledger"\) return null/);
		assert.doesNotMatch(submissionsSource, /Status \/ action/);
		assert.match(submissionsSource, /No evidence note/);
	});

	test("moves assignment creation beside the total badge", () => {
		assert.match(productionDocumentSource, /const createButton =/);
		assert.match(productionDocumentSource, /createButtonWithTooltip/);
		assert.match(
			productionDocumentSource,
			/Create \$\{workerMode \? "submission" : "assignment"\}/,
		);
		assert.match(
			productionDocumentSource,
			/<ProductionAssignmentForm closeForm=\{closeCreateForm\} \/>/,
		);
		assert.match(productionDocumentSource, /workerMode \? \(/);
	});

	test("distinguishes assignment records from staffed assignments", () => {
		assert.match(productionDocumentSource, /staffedAssignmentCount/);
		assert.match(
			productionDocumentSource,
			/\$\{staffedAssignmentCount\} of \$\{assignmentCount\} staffed/,
		);
		assert.match(assignmentRowSource, /Worker not assigned/);
		assert.match(assignmentRowSource, /assignment\.assignedToId/);
	});

	test("uses one aligned right-side action gutter", () => {
		assert.match(assignmentRowSource, /className="min-h-16[^\"]*sm:pr-0"/);
		assert.match(assignmentRowSource, /gap-3 pr-28 md:grid-cols/);
		assert.match(
			assignmentRowSource,
			/flex min-h-8 items-center justify-between gap-3 pr-8/,
		);
		assert.match(
			productionDocumentSource,
			/flex min-h-9 items-center justify-between gap-3 pr-8/,
		);
	});

	test("preserves the compact worker submission path", () => {
		assert.ok(
			assignmentRowSource.indexOf('if (view === "submissions")') <
				assignmentRowSource.indexOf('if (presentation === "document")'),
		);
		assert.match(productionDocumentSource, /view="submissions"/);
		assert.match(productionDocumentSource, /showCreateAction=\{false\}/);
	});
});
