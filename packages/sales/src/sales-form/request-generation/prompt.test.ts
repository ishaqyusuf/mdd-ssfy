import { expect, test } from "bun:test";
import { newSalesFormSeedV2Schema } from "../contracts/new-sales-form-seed";
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
	expect(instructions).toContain("Only linear-foot conversion requires a catalog length");
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

test("partial door example is a valid seed with an explicit unmatched product", () => {
	const lines = buildSalesRequestInstructions("{}").split("\n");
	const heading = lines.findIndex((line) =>
		line.startsWith("PARTIAL DOOR OUTPUT EXAMPLE"),
	);
	expect(heading).toBeGreaterThan(-1);
	const example = lines[heading + 1];
	if (!example) throw new Error("Partial door example is missing");
	const seed = newSalesFormSeedV2Schema.parse(JSON.parse(example));
	expect(seed.lineItems[0]?.housePackageTool?.doors).toHaveLength(1);
	expect(seed.unresolved).toHaveLength(1);
	expect(seed.unresolved[0]).toMatchObject({
		lineUid: seed.lineItems[0]?.uid,
		field: "door",
		status: "unsupported",
	});
	expect(seed.unresolved[0]?.stepId).not.toBeNull();
});

test("route guide distinguishes single-product multi-selects and excludes structural steps", () => {
	const instructions = buildSalesRequestInstructions(
		JSON.stringify({
			routes: [
				{
					itemTypeUid: "slab",
					rootStepId: 1,
					stepUids: ["height", "door", "hpt"],
					config: { noHandle: true, hasSwing: false },
				},
			],
			steps: [
				{
					id: 1,
					uid: "root",
					title: "Item Type",
					components: [["slab", "Slabs"]],
				},
				{
					id: 13,
					uid: "height",
					title: "Height",
					selectionMode: "single",
					components: [],
				},
				{
					id: 51,
					uid: "door",
					title: "Door",
					selectionMode: "multiple",
					components: [],
				},
				{ id: 212, uid: "hpt", title: "House Package Tool", components: [] },
				{ id: 999, uid: "other", title: "Unrelated", components: [] },
			],
		}),
	);
	const lines = instructions.split("\n");
	const i = lines.findIndex((line) => line.startsWith("ROUTE OUTPUT GUIDE"));
	expect(i).toBeGreaterThan(-1);
	const [guide] = JSON.parse(lines[i + 1]!);
	expect(guide.scalarSteps).toEqual([{ stepId: 13, title: "Height" }]);
	expect(guide.multipleSteps).toEqual([{ stepId: 51, title: "Door" }]);
	expect(guide.hptQuantityFields).toEqual(["dimension", "totalQty"]);
	expect(guide.swingAllowed).toBe(false);
	expect(instructions).toContain("exactly ONE product");
	expect(instructions).toContain("Never emit placeholder dimensions");
});
