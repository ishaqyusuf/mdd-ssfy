/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesFormCustomerOverviewCard } from "./customer-overview-card";

describe("sales form customer overview card", () => {
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
});
