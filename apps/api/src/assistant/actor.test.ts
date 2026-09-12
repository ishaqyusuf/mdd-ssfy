import { describe, expect, test } from "bun:test";
import { hasAssistantAccess } from "./actor";

describe("assistant access", () => {
	test("requires an eligible existing grant used by the assistant entry point", () => {
		expect(hasAssistantAccess({ viewOrders: true })).toBe(true);
		expect(hasAssistantAccess({ editOrders: true })).toBe(true);
		expect(hasAssistantAccess({ viewSales: true })).toBe(true);
		expect(hasAssistantAccess({ viewCustomers: true })).toBe(false);
		expect(hasAssistantAccess({})).toBe(false);
	});
});
