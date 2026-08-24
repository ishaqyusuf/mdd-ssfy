import { describe, expect, test } from "bun:test";

import { getProductionDispatchMutationPolicy } from "./production-dispatch-policy";

describe("production dispatch mutation policy", () => {
	test("allows an existing production assignment to complete during dispatch", () => {
		expect(
			getProductionDispatchMutationPolicy({
				dispatchMode: true,
				hasPendingAssignmentQuantity: true,
				hasPendingSubmissionQuantity: true,
			}),
		).toEqual({
			canCreateAssignment: false,
			canEditAssignment: false,
			canSubmitExistingAssignment: true,
		});
	});

	test("does not expose a submission action without pending assigned quantity", () => {
		expect(
			getProductionDispatchMutationPolicy({
				dispatchMode: true,
				hasPendingAssignmentQuantity: false,
				hasPendingSubmissionQuantity: false,
			}),
		).toEqual({
			canCreateAssignment: false,
			canEditAssignment: false,
			canSubmitExistingAssignment: false,
		});
	});

	test("allows assignment creation before dispatch when quantity remains", () => {
		expect(
			getProductionDispatchMutationPolicy({
				dispatchMode: false,
				hasPendingAssignmentQuantity: true,
				hasPendingSubmissionQuantity: false,
			}),
		).toEqual({
			canCreateAssignment: true,
			canEditAssignment: true,
			canSubmitExistingAssignment: false,
		});
	});
});
