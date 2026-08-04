import { describe, expect, it } from "bun:test";
import { render } from "../render";
import CustomerStatementEmail from "./customer-statement";

describe("CustomerStatementEmail", () => {
	it("renders a P.O. column and the order P.O. number", async () => {
		const html = await render(
			<CustomerStatementEmail
				customerEmail="billing@acme.test"
				customerName="Acme Millwork"
				statementTotal={800}
				lines={[
					{
						salesId: 42,
						orderNo: "0042",
						poNo: "PO-ACME-17",
						date: "08/04/26",
						invoice: 1200,
						paid: 400,
						pending: 800,
						customer: "Acme Millwork",
					},
				]}
			/>,
		);

		expect(html).toContain("P.O.");
		expect(html).toContain("PO-ACME-17");
	});
});
