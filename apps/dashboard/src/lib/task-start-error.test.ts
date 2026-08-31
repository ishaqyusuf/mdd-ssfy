import { describe, expect, test } from "bun:test";
import { AppError } from "@gnd/errors";
import { z } from "zod";
import { getTaskStartErrorMessage } from "./task-start-error";

describe("getTaskStartErrorMessage", () => {
	test("returns an actionable schema-owned validation message", () => {
		const schema = z.array(z.number()).max(40, {
			message: "Bulk production completion is limited to 40 orders.",
		});

		try {
			schema.parse(Array.from({ length: 41 }, (_, index) => index + 1));
		} catch (error) {
			expect(getTaskStartErrorMessage(error)).toBe(
				"Bulk production completion is limited to 40 orders.",
			);
		}
	});

	test("preserves an intentional public application error", () => {
		expect(
			getTaskStartErrorMessage(
				new AppError({
					code: "PERMISSION_DENIED",
					publicMessage:
						"You do not have permission to complete production work.",
				}),
			),
		).toBe("You do not have permission to complete production work.");
	});

	test("does not expose an unknown internal error", () => {
		expect(
			getTaskStartErrorMessage(new Error("database password leaked")),
		).toBe("Something went wrong. Please try again.");
	});
});
