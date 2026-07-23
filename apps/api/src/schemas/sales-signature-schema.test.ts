import { describe, expect, test } from "bun:test";
import { signPackingSlipSchema } from "./sales";

describe("signPackingSlipSchema", () => {
	test("accepts only canonical PNG data URLs for new signatures", () => {
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]).toString("base64");

		expect(
			signPackingSlipSchema.safeParse({
				dispatchId: 42,
				signature: `data:image/png;base64,${png}`,
			}).success,
		).toBe(true);
		expect(
			signPackingSlipSchema.safeParse({
				dispatchId: 42,
				signature: "https://blob.example/legacy-signature.png",
			}).success,
		).toBe(false);
	});
});
