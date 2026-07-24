import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	getSalesAddressEditParams,
	getSalesCustomerEditParams,
	isCompletedSalesAddressEdit,
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

	it("opens the address-only customer form for billing and shipping", () => {
		expect(
			getSalesAddressEditParams({
				customerId: 42,
				addressId: 7,
				address: "bad",
			}),
		).toEqual({
			customerForm: true,
			customerId: 42,
			addressId: 7,
			address: "bad",
		});
		expect(
			getSalesAddressEditParams({
				customerId: 42,
				addressId: null,
				address: "sad",
			}),
		).toEqual({
			customerForm: true,
			customerId: 42,
			address: "sad",
		});
		expect(
			getSalesAddressEditParams({
				customerId: null,
				addressId: 7,
				address: "bad",
			}),
		).toBeNull();
	});

	it("consumes only the matching completed address edit payload", () => {
		expect(
			isCompletedSalesAddressEdit({
				payloadCustomerId: 42,
				payloadAddress: "sad",
				requestedCustomerId: 42,
				requestedAddress: "sad",
			}),
		).toBe(true);
		expect(
			isCompletedSalesAddressEdit({
				payloadCustomerId: 42,
				payloadAddress: "bad",
				requestedCustomerId: 42,
				requestedAddress: "sad",
			}),
		).toBe(false);
	});

	it("keeps the canonical Sales Overview on shared customer and address actions", () => {
		const source = readFileSync(
			new URL("./sheets/sales-overview-sheet/general-tab.tsx", import.meta.url),
			"utf8",
		);

		expect(source.includes("SalesCustomerEditButton")).toBe(true);
		expect(source.includes("SalesAddressEditButton")).toBe(true);
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
