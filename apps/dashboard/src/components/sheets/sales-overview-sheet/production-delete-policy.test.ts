import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
	getProductionAssignmentDeleteRestriction,
	getProductionSubmissionDeleteRestriction,
} from "./production-delete-policy";

describe("production delete restrictions", () => {
	test("locks shipped submissions before lower-priority restrictions", () => {
		assert.equal(
			getProductionSubmissionDeleteRestriction({
				deliveredQuantity: 1,
				dispatchMode: true,
			}),
			"This submission contains shipped items and can no longer be deleted.",
		);
	});

	test("does not let material review state block submission retraction", () => {
		assert.equal(
			getProductionSubmissionDeleteRestriction({
				deliveredQuantity: 0,
				dispatchMode: false,
			}),
			null,
		);
	});

	test("explains the dispatch submission lock", () => {
		assert.match(
			getProductionSubmissionDeleteRestriction({
				deliveredQuantity: 0,
				dispatchMode: true,
			}) || "",
			/dispatch mode/,
		);
	});

	test("locks progressed or fulfilled assignments", () => {
		assert.match(
			getProductionAssignmentDeleteRestriction({
				orderFulfilled: false,
				hasSubmissions: true,
				dispatchMode: false,
			}) || "",
			/moved to the submission stage/,
		);
		assert.match(
			getProductionAssignmentDeleteRestriction({
				orderFulfilled: true,
				hasSubmissions: true,
				dispatchMode: true,
			}) || "",
			/fulfilled order/,
		);
	});

	test("leaves current-stage records deletable", () => {
		assert.equal(
			getProductionSubmissionDeleteRestriction({
				deliveredQuantity: 0,
				dispatchMode: false,
			}),
			null,
		);
		assert.equal(
			getProductionAssignmentDeleteRestriction({
				orderFulfilled: false,
				hasSubmissions: false,
				dispatchMode: false,
			}),
			null,
		);
	});

	test("renders the lock reason and disables both destructive controls", () => {
		const submissionsSource = readFileSync(
			new URL("./production-submissions.tsx", import.meta.url),
			"utf8",
		);
		const assignmentSource = readFileSync(
			new URL("./production-assignment-row.tsx", import.meta.url),
			"utf8",
		);
		const recordsSectionSource = readFileSync(
			new URL("./production/v2/production-item-document.tsx", import.meta.url),
			"utf8",
		);

		assert.match(submissionsSource, /deletionRestriction && !orderFulfilled/);
		assert.match(submissionsSource, /Boolean\(deletionRestriction\)/);
		assert.doesNotMatch(
			submissionsSource,
			/Submission cannot be delivered as it contains already shipped items\./,
		);
		assert.match(
			assignmentSource,
			/assignmentDeletionRestriction && !orderFulfilled/,
		);
		assert.match(assignmentSource, /Boolean\(assignmentDeletionRestriction\)/);
		assert.match(recordsSectionSource, /orderFulfilled/);
		assert.match(recordsSectionSource, /ProductionDeletionLockNotice/);
		assert.match(recordsSectionSource, /Assignment and submission records/);
	});
});
