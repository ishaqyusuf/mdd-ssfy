import { expect, test } from "bun:test";
import { SquareError } from "square";
import { getSquareRefundSubmissionFailure } from "./index";

test("recognizes a definite missing-payment rejection without leaking provider IDs", () => {
	const error = new SquareError({
		statusCode: 404,
		body: {
			errors: [
				{
					code: "NOT_FOUND",
					category: "INVALID_REQUEST_ERROR",
					detail: "Private payment id",
				},
			],
		},
	});
	expect(getSquareRefundSubmissionFailure(error)?.code).toBe(
		"SQUARE_PAYMENT_NOT_FOUND",
	);
	expect(getSquareRefundSubmissionFailure(error)?.message).not.toContain(
		"Private payment id",
	);
});

test("does not release a reservation for uncertain failures or unrelated errors", () => {
	for (const error of [
		new Error("Network timeout"),
		new SquareError({
			statusCode: 500,
			body: { errors: [{ code: "INTERNAL_SERVER_ERROR" }] },
		}),
		new SquareError({
			statusCode: 404,
			body: { errors: [{ code: "UNKNOWN" }] },
		}),
		new SquareError({
			statusCode: 429,
			body: { errors: [{ code: "RATE_LIMITED" }] },
		}),
	])
		expect(getSquareRefundSubmissionFailure(error)).toBeNull();
});
