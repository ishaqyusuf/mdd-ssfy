import { describe, expect, it } from "bun:test";

describe("legacy sales summary subtotal", () => {
	it("renders the authoritative pricing subtotal", async () => {
		const source = await Bun.file(
			new URL("./sales-meta-form.tsx", import.meta.url),
		).text();

		expect(source).toContain(
			"const displaySubTotal = Number(md.pricing?.subTotal || 0);",
		);
		expect(source).not.toContain("subtractMoney(");
	});
});
