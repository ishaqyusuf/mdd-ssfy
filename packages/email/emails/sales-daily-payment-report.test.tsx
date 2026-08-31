import { describe, expect, it } from "bun:test";
import { render } from "../render";
import { SalesDailyPaymentReportEmail } from "./sales-daily-payment-report";

describe("SalesDailyPaymentReportEmail", () => {
	it("renders the production report summary and download action", async () => {
		const html = await render(
			<SalesDailyPaymentReportEmail
				downloadUrl="https://example.com/report.xlsx"
				exceptionCount={2}
				generatedAt="08/30/2026, 00:02"
				methodTotals={[{ paymentMethod: "card", count: 3, netReceived: 980 }]}
				netReceived={980}
				paymentCount={3}
				periodEnd="08/29/2026, 23:59"
				periodStart="08/29/2026, 00:00"
				reportDate="2026-08-29"
				timezone="America/New_York"
				totalPaymentsReceived={1000}
				totalRefunds={20}
			/>,
		);

		expect(html).toContain("$980.00 Net Received");
		expect(html).toContain("Card");
		expect(html).toContain("2 exceptions");
		expect(html).toContain("flagged for accounting review");
		expect(html).toContain("https://example.com/report.xlsx");
		expect(html).toContain("background-color:#f1f3ef");
	});
});
