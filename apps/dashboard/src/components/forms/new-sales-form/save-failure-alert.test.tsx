import { expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSaveFailure } from "./save-failure";
import { SaveFailureAlert } from "./save-failure-alert";
it("renders persistent copyable details and distinguishes saved follow-up failures", () => {
	const failure = createSaveFailure(
		{
			data: {
				appError: {
					code: "SALES_POST_SAVE_REFRESH_FAILED",
					message:
						"The order was saved, but its production statistics could not be refreshed.",
					referenceId: "ERR-STATS",
					retryable: false,
				},
			},
		},
		"Refresh after save",
		"09623PC",
		true,
	);
	const html = renderToStaticMarkup(
		createElement(SaveFailureAlert, { failure, onDismiss: () => {} }),
	);
	expect(html).toContain('role="alert"');
	expect(html).toContain("Order saved; follow-up needs attention");
	expect(html).toContain("Copy error details");
	expect(html).toContain("ERR-STATS");
	expect(html).toContain("Do not resubmit");
});
