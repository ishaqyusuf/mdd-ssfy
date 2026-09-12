import { expect, test } from "bun:test";
import { buildSalesRequestInstructions } from "./prompt";

test("prompt uses the native door shell and forbids opening-to-leaf inference", () => {
	const instructions = buildSalesRequestInstructions("{}");

	expect(instructions).toContain("lineItems");
	expect(instructions).toContain("formSteps");
	expect(instructions).toContain("selectedProdUids");
	expect(instructions).toContain("lhQty");
	expect(instructions).toContain("rhQty");
	expect(instructions).toContain("totalQty");
	expect(instructions).toContain("noHandle:true");
	expect(instructions).toContain("swing");
	expect(instructions).toContain("Width is never a form step");
	expect(instructions).toContain(
		"one line with multiple housePackageTool.doors rows",
	);
	expect(instructions).toContain("structural and has no selectable component");
	expect(instructions).toContain('"qty":14');
	expect(instructions).toContain("Never infer leaf count");
	expect(instructions).toContain("Never select a closest-match component");
	expect(instructions).toContain("lineUid:null must also use stepId:null");
	expect(instructions).toContain("Repeat line-specific uncertainty");
	expect(instructions).toContain("custom:true");
	expect(instructions).toContain("meta.serviceRows");
	expect(instructions).toContain("meta.mouldingRows");
	expect(instructions).toContain("one row per selected component");
	expect(instructions).toContain("unique catalog profile or SKU");
	expect(instructions).toContain("same product");
	expect(instructions).toContain("ceil(linearFeet*");
	expect(instructions).toContain("include wastePercentage when");
	expect(instructions).toContain("title does not encode a length");
	expect(instructions).toContain("Generic wording such as baseboard");
	expect(instructions).toContain("never choose the first or closest profile");
	expect(instructions).toContain("Brick moulding or trim");
	expect(instructions).toContain('"linearFeet":400');
	expect(instructions).toContain('"pieceLength":16');
	expect(instructions).toContain('"qty":24');
	expect(instructions).toContain("Delivery is not a service");
	expect(instructions).toContain("never infer a charge from history");
	expect(instructions).not.toContain("handwritten request photos");
	expect(instructions).not.toContain("If an image is blurry");
});

test("prompt adds image-specific safety only for an attached image", () => {
	const instructions = buildSalesRequestInstructions("{}", { hasImages: true });

	expect(instructions).toContain("handwritten request photos");
	expect(instructions).toContain("If an image is blurry");
});
