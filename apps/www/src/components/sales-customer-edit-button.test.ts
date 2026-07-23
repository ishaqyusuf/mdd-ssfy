import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	getSalesCustomerEditParams,
	isCompletedSalesCustomerEdit,
} from "./sales-customer-edit-button";

describe("sales customer edit button", () => {
	it("opens the existing customer form for the selected customer", () => {
		expect(getSalesCustomerEditParams(42)).toEqual({
			customerForm: true,
			customerId: 42,
		});
		expect(getSalesCustomerEditParams(null)).toBe(null);
		expect(getSalesCustomerEditParams(0)).toBe(null);
	});

	it("consumes only the matching completed customer edit payload", () => {
		expect(
			isCompletedSalesCustomerEdit({
				payloadCustomerId: 42,
				requestedCustomerId: 42,
			}),
		).toBe(true);
		expect(
			isCompletedSalesCustomerEdit({
				payloadCustomerId: 84,
				requestedCustomerId: 42,
			}),
		).toBe(false);
		expect(
			isCompletedSalesCustomerEdit({
				payloadCustomerId: undefined,
				requestedCustomerId: 42,
			}),
		).toBe(false);
	});

	it("keeps all Sales Overview customer sections on the shared edit action", () => {
		const sources = [
			new URL("./sales-overview-system/tabs/overview-tab.tsx", import.meta.url),
			new URL("./sales-overview-system/tabs/overview/v2.tsx", import.meta.url),
			new URL("./sheets/sales-overview-sheet/general-tab.tsx", import.meta.url),
		].map((file) => readFileSync(file, "utf8"));

		for (const source of sources) {
			expect(source.includes("SalesCustomerEditButton")).toBe(true);
		}
	});

	it("uses the customer-edit permission rather than the order-edit permission", () => {
		const source = readFileSync(
			new URL("./sales-customer-edit-button.tsx", import.meta.url),
			"utf8",
		);

		expect(source.includes("editSalesCustomers")).toBe(true);
		expect(source.includes("editOrders")).toBe(false);
	});
});
