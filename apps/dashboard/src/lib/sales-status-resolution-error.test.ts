import { describe, expect, test } from "bun:test";

import { getSalesStatusResolutionErrorPresentation } from "./sales-status-resolution-error";

describe("sales status dependency resolution error presentation", () => {
	test("shows the server-authored direction and support reference", () => {
		const error = Object.assign(new Error("INTERNAL_SERVER_ERROR"), {
			data: {
				appError: {
					action: "refresh",
					code: "CONFLICT",
					message:
						"Order 09173PC changed while its production review was being approved. Refresh the fulfillment list and try this order again.",
					referenceId: "ERR-APPROVAL-11",
					retryable: false,
				},
			},
		});

		expect(getSalesStatusResolutionErrorPresentation(error)).toEqual({
			title: "This information has changed",
			description:
				"Order 09173PC changed while its production review was being approved. Refresh the fulfillment list and try this order again. Reference: ERR-APPROVAL-11",
		});
	});

	test("never renders an empty message for an opaque request failure", () => {
		const presentation = getSalesStatusResolutionErrorPresentation(
			new Error(""),
		);

		expect(presentation.title).toBe("Something went wrong");
		expect(presentation.description).toContain(
			"Something went wrong. Please try again.",
		);
		expect(presentation.description).toContain("Reference: ERR-");
	});
});
