import { describe, expect, it } from "bun:test";
import { render } from "../render";
import StorefrontOrderConfirmation from "./storefront-order-confirmation";

describe("StorefrontOrderConfirmation", () => {
	it("renders canonical order details without placeholder values", async () => {
		const html = await render(
			<StorefrontOrderConfirmation
				name="Acme Builders"
				orderId="STORE-2048"
				orderDate="July 20, 2026"
				shippingAddress={{
					street: "13285 SW 131st St",
					city: "Miami",
					state: "FL",
					zip: "33186",
				}}
				items={[{ name: "Configured Door", quantity: 2, price: 325 }]}
				total={650}
			/>,
		);

		expect(html).toContain("STORE-2048");
		expect(html).toContain("Configured Door");
		expect(html).toContain("Acme Builders");
		expect(html).not.toContain("Ishaq Yusuf");
	});
});
