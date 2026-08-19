import type { SalesSetting } from "../exports";
import { buildCustomerNameLines } from "./compose/customer-name-lines";
import { composeDoorSections } from "./compose/door-sections";
import { suppressMetadataBackedGroupSiblings } from "./compose/grouped-item-helpers";
import { composeLineItemSections } from "./compose/line-item-sections";
import { composeMouldingSections } from "./compose/moulding-sections";
import { composeServiceSections } from "./compose/service-sections";
import { composeShelfSections } from "./compose/shelf-sections";
import { getModeConfig } from "./constants";
import { buildPrintItemsFromSalesFormLineItems } from "./persisted-form-fallback";
import type { PrintSalesData } from "./query";
import type { AddressBlock, PrintSection } from "./types";

type InvoicePrintSnapshotInput = {
	lineItems: unknown;
	salesOrderId?: number | null;
	revisionDate?: Date | string | null;
	setting?: SalesSetting | null;
};

type InvoicePrintAddressSnapshotInput = {
	customer: unknown;
	billingAddress: unknown;
	shippingAddress: unknown;
};

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildSnapshotAddressLines(
	customerValue: unknown,
	addressValue: unknown,
) {
	const customer = record(customerValue);
	const address = record(addressValue);
	const meta = record(address.meta);
	const phone = text(address.phoneNo) || text(customer.phoneNo);
	const phone2 = text(address.phoneNo2);
	const email = text(address.email) || text(customer.email);
	const street =
		text(address.address1) || text(address.address2) || text(customer.address);
	const cityStateZip = [
		text(address.city),
		text(address.state),
		text(meta.zip_code),
	]
		.filter(Boolean)
		.join(" ");

	return [
		...buildCustomerNameLines({
			businessName: text(customer.businessName),
			customerName: text(customer.name),
			addressName: text(address.name),
			uppercase: true,
		}),
		[phone, phone2 ? `(${phone2})` : ""].filter(Boolean).join(" "),
		email?.toLowerCase(),
		street,
		cityStateZip,
	].filter(Boolean) as string[];
}

/** Matches the sales-preview address-line rules for an immutable approval snapshot. */
export function buildInvoicePrintAddressesFromSnapshot(
	input: InvoicePrintAddressSnapshotInput,
): { billing: AddressBlock; shipping: AddressBlock } {
	return {
		billing: {
			title: "Sold To",
			lines: buildSnapshotAddressLines(input.customer, input.billingAddress),
		},
		shipping: {
			title: "Ship To",
			lines: buildSnapshotAddressLines(input.customer, input.shippingAddress),
		},
	};
}

function resolveRevisionDate(value: InvoicePrintSnapshotInput["revisionDate"]) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	return new Date(0);
}

/** Composes an immutable Special Order snapshot with the current sales-preview pipeline. */
export function buildInvoicePrintSectionsFromSalesFormSnapshot(
	input: InvoicePrintSnapshotInput,
): PrintSection[] {
	const revisionDate = resolveRevisionDate(input.revisionDate);
	const salesOrderId = input.salesOrderId ?? -1;
	const items = buildPrintItemsFromSalesFormLineItems(input.lineItems, {
		salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
	});
	if (!items) return [];

	const sale = {
		id: salesOrderId,
		createdAt: revisionDate,
		updatedAt: revisionDate,
		items,
	} as unknown as PrintSalesData;
	const config = getModeConfig("invoice");
	const compositionSale = {
		...sale,
		items: suppressMetadataBackedGroupSiblings(sale.items),
	};

	return [
		...composeDoorSections(compositionSale, config, input.setting ?? null),
		...composeMouldingSections(compositionSale, config),
		...composeServiceSections(compositionSale, config),
		...composeShelfSections(compositionSale, config),
		...composeLineItemSections(compositionSale, config),
	].sort((a, b) => a.index - b.index);
}
