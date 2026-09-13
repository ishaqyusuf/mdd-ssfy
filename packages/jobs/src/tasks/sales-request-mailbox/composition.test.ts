import { describe, expect, test } from "bun:test";
import { createConfiguredSalesRequestMailboxJobRuntime } from "./composition";

describe("Sales Request mailbox job composition", () => {
	test("fails before creating a runnable graph when encryption is absent", () => {
		expect(() =>
			createConfiguredSalesRequestMailboxJobRuntime({
				db: {} as never,
				environment: {},
				fetch: globalThis.fetch,
			}),
		).toThrow("Mailbox encryption is not configured");
	});
});
