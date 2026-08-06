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
		expect(
			getSalesCustomerEditParams(42, {
				billingAddressId: 7,
				salesId: 77,
				salesType: "order",
				shippingAddressId: 8,
			}),
		).toEqual({
			billingAddressId: 7,
			customerForm: true,
			customerId: 42,
			salesId: 77,
			salesType: "order",
			shippingAddressId: 8,
		});
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
		).toBe(null);
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

	it("opens sales addresses in the Sales Overview secondary pane", () => {
		const sheetSource = readFileSync(
			new URL("./sheets/sales-overview-sheet/index.tsx", import.meta.url),
			"utf8",
		);
		const generalSource = readFileSync(
			new URL("./sheets/sales-overview-sheet/general-tab.tsx", import.meta.url),
			"utf8",
		);
		const sharedSheetSource = readFileSync(
			new URL(
				"../../../../packages/ui/src/components/custom/sheet-v2.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(sheetSource.includes("SalesAddressPane")).toBe(true);
		expect(sheetSource.includes("CustomerEditPane")).toBe(true);
		expect(sheetSource.includes("secondaryOpened")).toBe(true);
		expect(generalSource.includes("onEditAddress")).toBe(true);
		expect(generalSource.includes("onEditCustomer")).toBe(true);
		expect(sheetSource.includes("paneOpened")).toBe(true);
		expect(
			sheetSource.includes('from "@gnd/ui/custom/sheet-v2"'),
		).toBe(true);
		expect(sharedSheetSource.includes("Back to sales overview")).toBe(true);
		expect(sharedSheetSource.includes("resolveCustomSheetDismissLayer")).toBe(
			true,
		);
		expect(sharedSheetSource.includes("data-sheet-divider")).toBe(true);
		expect(sharedSheetSource.includes("sm:max-w-none")).toBe(true);
		expect(sharedSheetSource.includes("custom-sheet-primary-footer")).toBe(
			true,
		);
		expect(sharedSheetSource.includes("sheet.primaryPortalId")).toBe(true);
		expect(sharedSheetSource.includes("onPointerDownOutside")).toBe(true);
		expect(sharedSheetSource.includes("event.preventDefault()")).toBe(true);
		expect(sharedSheetSource.includes('"pointerup"')).toBe(true);
		expect(sharedSheetSource.includes("onSecondaryExited")).toBe(true);
		expect(sheetSource.includes('primarySize="2xl"')).toBe(true);
		expect(sheetSource.includes('secondarySize="2xl"')).toBe(true);
		expect(sheetSource.includes("onSecondaryExited={handlePaneExited}")).toBe(
			true,
		);
	});

	it("keeps every Sales Overview secondary workflow on the animated shared contract", () => {
		const paneFiles = [
			"customer-edit-pane.tsx",
			"sales-address-pane.tsx",
			"inbound-create-pane.tsx",
			"inbound-detail-pane.tsx",
		];

		for (const file of paneFiles) {
			const source = readFileSync(
				new URL(`./sheets/sales-overview-sheet/${file}`, import.meta.url),
				"utf8",
			);

			expect(source.includes("<Sheet.SecondaryContent")).toBe(true);
			expect(source.includes("<Sheet.SecondaryHeader")).toBe(true);
			expect(source.includes('from "@gnd/ui/custom/sheet-v2"')).toBe(true);
		}

		const overviewSource = readFileSync(
			new URL("./sheets/sales-overview-sheet/index.tsx", import.meta.url),
			"utf8",
		);
		expect(overviewSource.includes("onClose={closePane}")).toBe(true);
		expect(overviewSource.includes("paneTriggerRef")).toBe(true);
		expect(overviewSource.includes("requestAnimationFrame")).toBe(true);
	});

	it("uses Save in the address pane and locks fulfilled sales", () => {
		const paneSource = readFileSync(
			new URL(
				"./sheets/sales-overview-sheet/sales-address-pane.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const generalSource = readFileSync(
			new URL("./sheets/sales-overview-sheet/general-tab.tsx", import.meta.url),
			"utf8",
		);
		const addressFieldsSource = readFileSync(
			new URL(
				"./forms/customer-form/customer-address-fields.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const overviewSource = readFileSync(
			new URL("./sheets/sales-overview-sheet/index.tsx", import.meta.url),
			"utf8",
		);
		const addressPaneSource = readFileSync(
			new URL(
				"./sheets/sales-overview-sheet/sales-address-pane.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const customerPaneSource = readFileSync(
			new URL(
				"./sheets/sales-overview-sheet/customer-edit-pane.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const formActionSource = readFileSync(
			new URL("./forms/customer-form/form-action.tsx", import.meta.url),
			"utf8",
		);

		expect(
			/<SubmitButton[\s\S]*?>\s*Save\s*<\/SubmitButton>/.test(paneSource),
		).toBe(true);
		expect(
			generalSource.includes('documentStatus.status === "fulfilled"'),
		).toBe(true);
		const customerButtonStart = generalSource.indexOf(
			"<SalesCustomerEditButton",
		);
		const customerButtonEnd = generalSource.indexOf("/>", customerButtonStart);
		expect(
			generalSource
				.slice(customerButtonStart, customerButtonEnd)
				.includes("addressEditingLocked"),
		).toBe(false);
		expect(addressFieldsSource.includes('fieldName(prefix, "name")')).toBe(
			true,
		);
		expect(addressFieldsSource.includes('label="Recipient Name"')).toBe(true);
		expect(
			overviewSource.includes(
				"billingAddressId={data.addressData?.billing?.id}",
			),
		).toBe(true);
		expect(
			/billingId:[\s\S]*?: billingAddressId,/.test(addressPaneSource),
		).toBe(true);
		expect(overviewSource.includes("addressEditingLocked=")).toBe(true);
		expect(customerPaneSource.includes("addressReadOnly")).toBe(true);
		expect(formActionSource.includes("customerOnly: true")).toBe(true);
		expect(addressFieldsSource.includes('setAddressValue("placeId"')).toBe(
			true,
		);
	});

	it("keeps Sales Overview primary footers visible beside secondary panes", () => {
		for (const file of [
			"general-footer.tsx",
			"production-tab-footer.tsx",
			"dispatch-footer.tsx",
		]) {
			const source = readFileSync(
				new URL(`./sheets/sales-overview-sheet/${file}`, import.meta.url),
				"utf8",
			);
			expect(source.includes("<Sheet.Portal>")).toBe(true);
			expect(source.includes("hideWhenSecondary")).toBe(false);
			expect(source.includes('from "@gnd/ui/custom/sheet-v2"')).toBe(
				true,
			);
			expect(source.includes("../custom-sheet-content")).toBe(false);
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
