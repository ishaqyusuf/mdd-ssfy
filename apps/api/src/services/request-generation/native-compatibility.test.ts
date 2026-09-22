import { expect, test } from "bun:test";
import { projectSalesRequestPartialNativeSeed, verifySalesRequestNativeSeedCompatibility } from "./native-compatibility";

const configuration = JSON.stringify({
	schemaVersion: 1,
	routes: [{ itemTypeUid: "prehung", rootStepId: 1, stepUids: ["door"] }],
	steps: [
		{ id: 1, uid: "item-type", title: "Item Type", components: [["prehung", "Prehung"]] },
		{ id: 2, uid: "door", title: "Door", components: [] },
	],
	visibilityByComponentUid: {},
});

test("empty provider fallback cannot be promoted as a native partial draft", async () => {
	const result = await verifySalesRequestNativeSeedCompatibility({
		schemaVersion: 2, lineItems: [], unresolved: [{ lineUid: null, stepId: null,
			field: "door", status: "ambiguous", reason: "Which door?" }],
	}, configuration);
	expect(result).toMatchObject({ initializer: "blocked", saveReopen: "blocked",
		issues: expect.arrayContaining(["empty-native-draft"]) });
});

test("a successful partial projection may open with review notes and no guessed Door line", async () => {
	const source = 'Guest Room - 28" x 80"';
	const projected = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "guest-room", qty: 1,
			formSteps: [{ stepId: 1, prodUid: "prehung" }],
			housePackageTool: { doors: [{ dimension: "2-4 x 6-8", totalQty: 1 }] } }],
		unresolved: [],
	}, source, configuration);
	expect(projected.lineItems).toEqual([]);
	expect(projected.unresolved.some((item) => item.reason.includes(source))).toBe(true);
	expect(await verifySalesRequestNativeSeedCompatibility(projected, configuration, true))
		.toMatchObject({ initializer: "passed", saveReopen: "passed", issues: [] });
});

test("three native HPT lines missing their Door selection stay ineligible", async () => {
	const result = await verifySalesRequestNativeSeedCompatibility({
		schemaVersion: 2,
		lineItems: [1, 2, 3].map((number) => ({
			uid: `room-${number}`, qty: 1,
			formSteps: [{ stepId: 1, prodUid: "prehung" }],
			housePackageTool: { doors: [{ dimension: "2-4 x 6-8", totalQty: 1 }] },
		})),
		unresolved: [],
	}, configuration);
	expect(result.initializer).toBe("blocked");
	expect(result.saveReopen).toBe("blocked");
	expect(result.issues).toContain("hpt-door-selection-missing:room-1:2");
});

test("partial native projection retains generated facts and separates repeated source rows", async () => {
	const source = "Plain Room - 28\" x 80\"\nPlain Room - 28\" x 80\"";
	const seed = { schemaVersion: 2 as const,
		lineItems: [{ uid: "plain-room", qty: 2,
			formSteps: [{ stepId: 1, prodUid: "prehung" }],
			housePackageTool: { doors: [{ dimension: "2-4 x 6-8", totalQty: 2 }] } }],
		unresolved: [
			{ lineUid: "plain-room", stepId: 2, field: "door",
				status: "ambiguous" as const, reason: "Confirm Door product" },
			{ lineUid: null, stepId: null, field: "customerNote",
				status: "unsupported" as const, reason: "Confirm the global note." },
			{ lineUid: null, stepId: null, field: "customerNote",
				status: "unsupported" as const, reason: "Confirm the global note." },
		],
	};
	const projected = projectSalesRequestPartialNativeSeed(seed, source, configuration);
	expect(seed.lineItems[0]?.housePackageTool?.doors).toHaveLength(1);
	expect(seed.unresolved[0]?.lineUid).toBe("plain-room");
	expect(projected.lineItems).toEqual([]);
	expect(projected.unresolved.filter((item) =>
		item.field === "doorSchedule" && item.reason.includes("Plain Room - 28\" x 80\"")))
		.toHaveLength(2);
	expect(projected.unresolved.filter((item) => item.field === "door")).toEqual([]);
	expect(projected.unresolved.filter((item) => item.field === "customerNote"))
		.toHaveLength(1);
	expect((await verifySalesRequestNativeSeedCompatibility(projected, configuration)).issues)
		.toEqual(["empty-native-draft"]);
});

test("an omitted single Door row keeps its exact source evidence in Sales review", () => {
	const source = 'Guest Room - 28" x 80"';
	const projected = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "guest-room", qty: 1,
			formSteps: [{ stepId: 1, prodUid: "prehung" }],
			housePackageTool: { doors: [{ dimension: "2-4 x 6-8", totalQty: 1 }] } }],
		unresolved: [],
		interpretations: [{ lineUid: "guest-room", stepId: 1,
			selectedProdUid: "prehung", selectedTitle: "Prehung",
			sourceText: source, reason: "Customer room" }],
	}, source, configuration);
	expect(projected.interpretations).toEqual([]);
	expect(projected.unresolved.some((item) => item.reason.includes(`source evidence: ${source}`))).toBe(false);
	expect(projected.unresolved.some((item) => item.reason.includes(`Source door row 1: ${source}`))).toBe(true);
	expect(projected.unresolved).toHaveLength(1);
});

test("a Door route with only Item Type is review-only even without an HPT schedule", () => {
	const seed = { schemaVersion: 2 as const,
		lineItems: [{ uid: "line-2", qty: 1,
			formSteps: [{ stepId: 1, prodUid: "prehung" }] }],
		unresolved: [],
	};
	const projected = projectSalesRequestPartialNativeSeed(seed, "2-8 x 6-8", configuration);
	expect(seed.lineItems).toHaveLength(1);
	expect(projected.lineItems).toEqual([]);
	expect(projected.unresolved.some((item) =>
		item.reason.includes("line-2, quantity 1") && item.reason.includes("Not created"))).toBe(true);
});

test("a configured Door shell survives when only the Door product is unresolved", async () => {
	const configured = JSON.stringify({
		routes: [{ itemTypeUid: "exterior", rootStepId: 1,
			stepUids: ["configuration", "height", "door"] }],
		steps: [
			{ id: 1, uid: "item-type", title: "Item Type",
				components: [["exterior", "Exterior"]] },
			{ id: 2, uid: "configuration", title: "Door Configuration",
				components: [["double", "Exterior Door - Double"]] },
			{ id: 3, uid: "height", title: "Height",
				components: [["height-68", "6-8"]] },
			{ id: 4, uid: "door", title: "Door", components: [] },
		],
		visibilityByComponentUid: {},
	});
	const projected = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "fire-double", qty: 2, formSteps: [
			{ stepId: 1, prodUid: "exterior" },
			{ stepId: 2, prodUid: "double" },
			{ stepId: 3, prodUid: "height-68" },
		], housePackageTool: { doors: [
			{ dimension: "3-0 x 6-8", swing: "outswing", lhQty: 0, rhQty: 2 },
		] } }],
		unresolved: [{ lineUid: "fire-double", stepId: 4, field: "door",
			status: "unsupported", reason: "No compatible exterior fire-rated Door product." }],
	}, "Two exterior double prehung units, 36 x 80, outward right", configured);
	expect(projected.lineItems).toEqual([{ uid: "fire-double", qty: 2, formSteps: [
		{ stepId: 1, prodUid: "exterior" },
		{ stepId: 2, prodUid: "double" },
		{ stepId: 3, prodUid: "height-68" },
	] }]);
	expect(projected.unresolved).toContainEqual(expect.objectContaining({
		lineUid: "fire-double", field: "doorSchedule",
		reason: expect.stringContaining("2 doors at 3-0 x 6-8"),
	}));
	expect(await verifySalesRequestNativeSeedCompatibility(projected, configured, true))
		.toMatchObject({ initializer: "passed", saveReopen: "passed", issues: [] });
});

test("an accessory route survives while an incomplete Door route is reviewed", () => {
	const mixedConfiguration = JSON.stringify({
		routes: [
			{ itemTypeUid: "prehung", rootStepId: 1, stepUids: ["door"] },
			{ itemTypeUid: "trim", rootStepId: 1, stepUids: [] },
		],
		steps: [
			{ id: 1, uid: "item-type", title: "Item Type", components: [["prehung", "Prehung"], ["trim", "Trim"]] },
			{ id: 2, uid: "door", title: "Door", components: [] },
		],
		visibilityByComponentUid: {},
	});
	const projected = projectSalesRequestPartialNativeSeed({ schemaVersion: 2,
		lineItems: [
			{ uid: "line-1", qty: 1, formSteps: [{ stepId: 1, prodUid: "prehung" }] },
			{ uid: "trim", qty: 6, formSteps: [{ stepId: 1, prodUid: "trim" }] },
		], unresolved: [{ lineUid: "trim", stepId: null, field: "trimFinish",
			status: "unsupported", reason: "Confirm the trim finish." }],
	}, "2-8 x 6-8\nSix pieces of trim", mixedConfiguration);
	expect(projected.lineItems.map((line) => line.uid)).toEqual(["trim"]);
	expect(projected.unresolved.some((item) => item.reason.includes("line-1, quantity 1"))).toBe(true);
	expect(projected.unresolved).toContainEqual(expect.objectContaining({
		lineUid: "trim", field: "trimFinish", reason: "Confirm the trim finish.",
	}));
});

test("an accessory with no identified catalog product stays in review without a priced shell", async () => {
	const accessoryConfiguration = JSON.stringify({
		routes: [{ itemTypeUid: "hardware", rootStepId: 1, stepUids: ["line-item"] }],
		steps: [
			{ id: 1, uid: "item-type", title: "Item Type",
				components: [["hardware", "Door Hardware"]] },
			{ id: 2, uid: "line-item", title: "Line Item",
				components: [["weatherstrip", "BLACK WEATHERSTRIP"]] },
		],
		visibilityByComponentUid: {},
	});
	const projected = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "pocket-hardware", qty: 1,
			formSteps: [{ stepId: 1, prodUid: "hardware" }] }],
		unresolved: [{
			lineUid: "pocket-hardware", stepId: null, field: "hardwareProduct",
			status: "unsupported",
			reason: "Pocket door hardware requested but no exact product matches.",
		}],
	}, "Pocket door hardware", accessoryConfiguration);

	expect(projected.lineItems).toEqual([]);
	expect(projected.unresolved).toEqual([
		expect.objectContaining({
			lineUid: null,
			stepId: null,
			field: "hardwareProduct",
		}),
	]);
	expect(await verifySalesRequestNativeSeedCompatibility(
		projected,
		accessoryConfiguration,
		true,
	)).toMatchObject({ initializer: "passed", saveReopen: "passed", issues: [] });

	const selectedProduct = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "selected-hardware", qty: 1, formSteps: [
			{ stepId: 1, prodUid: "hardware" },
			{ stepId: 2, prodUid: "weatherstrip" },
		] }],
		unresolved: [{
			lineUid: "selected-hardware", stepId: null, field: "hardwareProduct",
			status: "unsupported",
			reason: "No exact product matches the original wording; review the selected product.",
		}],
	}, "Pocket door hardware", accessoryConfiguration);
	expect(selectedProduct.lineItems).toHaveLength(1);
});

test("Duplex projection keeps every sided door occurrence and removes empty attic placeholders", () => {
	const duplexConfiguration = JSON.stringify({
		routes: [
			{ itemTypeUid: "prehung", rootStepId: 1, stepUids: ["door"] },
			{ itemTypeUid: "mouldings", rootStepId: 1, stepUids: ["moulding-products"] },
		],
		steps: [
			{ id: 1, uid: "item-type", title: "Item Type", components: [
				["prehung", "Prehung"], ["mouldings", "Mouldings"],
			] },
			{ id: 2, uid: "door", title: "Door", components: [] },
			{ id: 3, uid: "moulding-products", title: "Mouldings", components: [] },
		],
		visibilityByComponentUid: {},
	});
	const left = [
		'30” = AC CLOSET LUVER BIFOLD', '30” LT = 1st BEDROOM',
		'2 x 30” LT= BEDROOM CLOSET BIFOLDS', '30” = LINEN CLOSET BIFOLD',
		'30” LT = 2nd BEDROOM', '2 x 30” LT= BEDROOM CLOSET BIFOLDS',
		'32”LT = COMMON BATHROOM', '32”RT = LAUNDRY CLOSET RT',
		'32” = MBR LT', '32” = MBR CLOSET LT', '32” RT = MBR BATH',
	];
	const right = [
		'30” = AC CLOSET LUVER BIFOLD', '32” LT = 1st BEDROOM',
		'2 x 30” LT= BEDROOM CLOSET BIFOLDS', '30” = LINEN CLOSET BIFOLD',
		'32” LT = 2nd BEDROOM', '2 x 30” LT= BEDROOM CLOSET BIFOLDS',
		'30” LT = COMMON BATHROOM', '32”RT = LAUNDRY CLOSET RT',
		'32” = MBR RT', '30” = MBR CLOSET LT', '32” LT = MBR BATH',
	];
	const source = [
		"Left Side", "1 ATTIC ACCESS", "DOORS", ...left,
		"Right Side", "1 ATTIC ACCESS", "DOORS", ...right,
	].join("\n");
	const projected = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [
			{ uid: "door-schedule", qty: 26,
				formSteps: [{ stepId: 1, prodUid: "prehung" }] },
			{ uid: "attic-left", qty: 1,
				formSteps: [{ stepId: 1, prodUid: "mouldings" }] },
			{ uid: "attic-right", qty: 1,
				formSteps: [{ stepId: 1, prodUid: "mouldings" }] },
		],
		unresolved: [
			{ lineUid: "door-schedule", stepId: 2, field: "door",
				status: "unsupported", reason: "Door product is missing." },
			{ lineUid: "attic-left", stepId: 3, field: "moulding",
				status: "unsupported", reason: "Moulding product is missing." },
		],
	}, source, duplexConfiguration);

	expect(projected.lineItems).toEqual([]);
	const doorReviews = projected.unresolved.filter((item) => item.field === "doorSchedule");
	expect(doorReviews).toHaveLength(22);
	expect(doorReviews.filter((item) => item.reason.startsWith("Left Side door row")))
		.toHaveLength(11);
	expect(doorReviews.filter((item) => item.reason.startsWith("Right Side door row")))
		.toHaveLength(11);
	expect(new Set(doorReviews.map((item) => item.reason)).size).toBe(22);
	expect(doorReviews.reduce((total, item) =>
		total + Number(item.reason.match(/\((\d+) units?\)/)?.[1] ?? 0), 0)).toBe(26);
	expect(projected.unresolved.filter((item) => item.field === "moulding").map((item) => item.reason))
		.toEqual([
			"Left Side: 1 ATTIC ACCESS. No compatible Mouldings product was configured; add this exact source item in Sales after selecting its catalog product.",
			"Right Side: 1 ATTIC ACCESS. No compatible Mouldings product was configured; add this exact source item in Sales after selecting its catalog product.",
		]);
	const withoutAtticPlaceholders = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [{ uid: "door-schedule", qty: 26,
			formSteps: [{ stepId: 1, prodUid: "prehung" }] }],
		unresolved: [],
	}, source, duplexConfiguration);
	expect(withoutAtticPlaceholders.unresolved.filter((item) =>
		item.reason.includes("ATTIC ACCESS")).map((item) => item.reason)).toEqual([
		"Left Side: 1 ATTIC ACCESS. No compatible Mouldings product was configured; add this exact source item in Sales after selecting its catalog product.",
		"Right Side: 1 ATTIC ACCESS. No compatible Mouldings product was configured; add this exact source item in Sales after selecting its catalog product.",
	]);
	const atticOnly = projectSalesRequestPartialNativeSeed({
		schemaVersion: 2,
		lineItems: [],
		unresolved: [{ lineUid: null, stepId: null, field: "item",
			status: "unsupported", reason: "Review the request." }],
	}, "Left Side\n1 ATTIC ACCESS", duplexConfiguration);
	expect(atticOnly.unresolved.some((item) =>
		item.reason.startsWith("Left Side: 1 ATTIC ACCESS."))).toBe(true);
});
