import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

describe("fulfillment dispatch notifications", () => {
	it("does not announce the internal dispatch created by Mark as Fulfilled", async () => {
		const source = await readFile(
			new URL("./dispatch.route.ts", import.meta.url),
			"utf8",
		);
		const start = source.indexOf(
			"ensureSalesOrderFulfillmentDispatch: protectedProcedure",
		);
		const end = source.indexOf("orderDispatchOverview: protectedProcedure", start);
		const implementation = source.slice(start, end);

		expect(start).toBeGreaterThanOrEqual(0);
		expect(end).toBeGreaterThan(start);
		expect(implementation).toContain("tx.orderDelivery.create");
		expect(implementation).not.toContain("sales_dispatch_created");
		expect(implementation).not.toContain("getDispatchNotificationService");
	});

	it("keeps genuine dispatch-created notification handling available", async () => {
		const source = await readFile(
			new URL("./dispatch.route.ts", import.meta.url),
			"utf8",
		);
		const start = source.indexOf("async function sendDispatchCreatedNotifications");
		const implementation = source.slice(start, start + 1_100);

		expect(start).toBeGreaterThanOrEqual(0);
		expect(implementation).toContain('send("sales_dispatch_created"');
		expect(implementation).toContain('send("sales_dispatch_assigned"');
	});
});
