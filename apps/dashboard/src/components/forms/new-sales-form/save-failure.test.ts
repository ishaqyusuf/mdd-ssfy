import { expect, it } from "bun:test";
import { createSaveFailure } from "./save-failure";
it("copies the server reference and safe reason without raw request details", () => {
	const failure = createSaveFailure(
		{
			message: "secret database query",
			data: {
				appError: {
					code: "SALES_RELATIONAL_REVIEW_REQUIRED",
					message: "Order needs administrator review.",
					referenceId: "ERR-123",
					retryable: false,
				},
			},
		},
		"Save order",
		"09623PC",
	);
	expect(failure.details).toContain("Reference: ERR-123");
	expect(failure.details).toContain("Order: 09623PC");
	expect(failure.details).toContain("SALES_RELATIONAL_REVIEW_REQUIRED");
	expect(failure.details).not.toContain("secret");
});
it("sanitizes unknown errors", () => {
	expect(
		createSaveFailure(new Error("SQL password=secret"), "Save draft").details,
	).not.toContain("secret");
});

it("distinguishes a failed follow-up from an unconfirmed save", () => {
	const failure = createSaveFailure(
		new Error("refresh failed"),
		"Refresh after save",
		"09623PC",
		true,
	);
	expect(failure.saved).toBe(true);
	expect(failure.details).toContain("Save confirmed: Yes");
});
