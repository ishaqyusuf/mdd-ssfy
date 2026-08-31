import { describe, expect, it } from "bun:test";
import { createDispatchesSchema } from "./dispatch-workspace";

describe("createDispatchesSchema", () => {
	it("accepts individual dates with an optional batch override", () => {
		const result = createDispatchesSchema.safeParse({
			orders: [
				{ salesId: 101, dueDate: new Date("2026-09-01") },
				{ salesId: 102, dueDate: new Date("2026-09-04") },
			],
			overrideDueDate: new Date("2026-09-08"),
			deliveryMode: "delivery",
			driverId: 9,
		});

		expect(result.success).toBe(true);
	});

	it("rejects duplicate sales orders", () => {
		const result = createDispatchesSchema.safeParse({
			orders: [
				{ salesId: 101, dueDate: new Date("2026-09-01") },
				{ salesId: 101, dueDate: new Date("2026-09-04") },
			],
			deliveryMode: "delivery",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain("only once");
		}
	});
});
