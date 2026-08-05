import { describe, expect, it } from "bun:test";
import { getRestErrorResponse } from "./error-response";

describe("REST error response", () => {
	it("returns a stable public envelope for unexpected failures", () => {
		const response = getRestErrorResponse(
			new Error("Prisma transaction P2028 failed"),
		);

		expect(response.status).toBe(500);
		expect(response.body.error).toMatchObject({
			code: "UNEXPECTED",
			message: "Something went wrong. Please try again.",
		});
		expect(JSON.stringify(response)).not.toContain("Prisma");
	});

	it("uses canonical copy for untyped HTTP messages", () => {
		const response = getRestErrorResponse(
			Object.assign(new Error("The invoice could not be found."), {
				status: 404,
			}),
		);

		expect(response.status).toBe(404);
		expect(response.body.error.message).toBe(
			"The requested information could not be found.",
		);
	});
});
