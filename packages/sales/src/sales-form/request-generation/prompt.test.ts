import { expect, test } from "bun:test";
import { buildSalesRequestInstructions } from "./prompt";

test("prompt uses the native door shell and forbids opening-to-leaf inference", () => {
	const instructions = buildSalesRequestInstructions("{}");

	expect(instructions).toContain("lineItems");
	expect(instructions).toContain("formSteps");
	expect(instructions).toContain("selectedProdUids");
	expect(instructions).toContain("lhQty");
	expect(instructions).toContain("rhQty");
	expect(instructions).toContain("swing");
	expect(instructions).toContain("Never infer leaf count");
	expect(instructions).toContain("custom:true");
	expect(instructions).toContain("meta.serviceRows");
	expect(instructions).toContain("Delivery is not a service");
	expect(instructions).toContain("never infer a charge from history");
});
