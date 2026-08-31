import { describe, expect, it } from "bun:test";
import { render } from "../render";
import { DispatchCreatedEmail, DispatchDriver } from "./dispatch-driver";

describe("dispatch emails", () => {
	it("renders an assigned dispatch with production details", async () => {
		const html = await render(
			<DispatchDriver
				deliveryMode="delivery"
				dispatchId={2841}
				dueDate="2026-09-03T09:00:00.000Z"
				orderNo="GND-10482"
				recipientName="Alex Morgan"
			/>,
		);

		expect(html).toContain("A Dispatch Is Ready for You");
		expect(html).toContain("#2841");
		expect(html).toContain("GND-10482");
		expect(html).toContain("Local delivery");
		expect(html).toContain("Sep 3, 2026");
		expect(html).toContain("background-color:#f1f3ef");
	});

	it("keeps the created state distinct", async () => {
		const html = await render(
			<DispatchCreatedEmail
				deliveryMode="pickup"
				dispatchId={2842}
				orderNo="GND-10483"
				recipientName="Dispatch coordinator"
			/>,
		);

		expect(html).toContain("Dispatch Created");
		expect(html).toContain("Customer pickup");
		expect(html).toContain("Confirm the driver assignment");
	});
});
