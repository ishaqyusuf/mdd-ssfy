/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SalesFormCustomerOverviewCard,
	shouldShowSameAsBillingAction,
} from "./customer-overview-card";

describe("sales form customer overview card", () => {
	it("starts expanded so customer addresses are visible", () => {
		const html = renderToStaticMarkup(
			<SalesFormCustomerOverviewCard
				billingLines={["100 Billing Way"]}
				customerName="Ada Lovelace"
				profileOptions={[]}
				profileValue="none"
				shippingLines={["200 Shipping Way"]}
			/>,
		);

		expect(html).toContain('aria-expanded="true"');
		expect(html).toContain("100 Billing Way");
		expect(html).toContain("200 Shipping Way");
	});

	it("renders distinct edit and change customer actions", () => {
		const html = renderToStaticMarkup(
			<SalesFormCustomerOverviewCard
				accountNumber={42}
				customerName="Ada Lovelace"
				onChangeCustomer={() => undefined}
				onEditCustomer={() => undefined}
				profileOptions={[]}
				profileValue="none"
			/>,
		);

		expect(html).toContain('aria-label="Edit customer"');
		expect(html).toContain(">Edit</button>");
		expect(html).toContain('aria-label="Change customer"');
		expect(html).toContain(">Change</button>");
	});

	it("omits actions that are not permitted by the caller", () => {
		const html = renderToStaticMarkup(
			<SalesFormCustomerOverviewCard
				accountNumber={42}
				customerName="Ada Lovelace"
				profileOptions={[]}
				profileValue="none"
			/>,
		);

		expect(html).not.toContain('aria-label="Edit customer"');
		expect(html).not.toContain('aria-label="Change customer"');
	});

	it("renders interactive address edits and the distinct-shipping action", () => {
		const source = readFileSync(
			new URL("./customer-overview-card.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("onEdit={props.onEditBillingAddress}");
		expect(source).toContain("onEdit={props.onEditShippingAddress}");
		expect(source).toContain("cursor-pointer");
		expect(source).toContain("hover:bg-muted/60");
		expect(source).toContain("Use billing address for shipping?");
	});

	it("hides the same-as-billing action when both addresses already match", () => {
		expect(
			shouldShowSameAsBillingAction({
				hasAction: true,
				shippingMatchesBilling: true,
			}),
		).toBe(false);
		expect(
			shouldShowSameAsBillingAction({
				hasAction: true,
				shippingMatchesBilling: false,
			}),
		).toBe(true);
	});
});
