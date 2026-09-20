import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { salesRequestGroundingText } from "./sales-request-context";
import {
	generateNewSalesFormSeed,
	salesRequestProviderTimeoutMs,
	validateNewSalesFormSeedConfiguration,
} from "./sales-request-generation";

test("gives a dense named-room schedule enough time for the larger structured output", () => {
	const rows = Array.from({ length: 12 }, (_, index) =>
		`Room ${index + 1} - 32\" x 96\"`);
	expect(salesRequestProviderTimeoutMs(rows.slice(0, 11).join("\n"))).toBe(45_000);
	expect(salesRequestProviderTimeoutMs(rows.join("\n"))).toBe(90_000);
});

test("rejects an interior route when the request explicitly says exterior only", () => {
	const configuration = {
		schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: [] }],
		steps: [{
			id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["interior", "Interior pre-hung"]],
		}],
		visibilityByComponentUid: {},
	};
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 1,
		lineItems: [{ uid: "line-1", qty: 2, formSteps: [{ stepId: 1, prodUid: "interior" }] }],
		unresolved: [],
	}, JSON.stringify(configuration),
	"Necesito dos unidades precolgadas para exterior, con apertura hacia afuera a la derecha.",
	)).toThrow(/interior route for an exterior-only customer request/);
});

test("rejects slab-only fulfillment of an explicitly pre-hung request", () => {
	const configuration = {
		schemaVersion: 1,
		routes: [{ itemTypeUid: "slabs", rootStepId: 1, stepUids: [] }],
		steps: [{
			id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["slabs", "Door Slabs Only"]],
		}],
		visibilityByComponentUid: {},
	};
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ uid: "line-1", qty: 4, formSteps: [{ stepId: 1, prodUid: "slabs" }] }],
		unresolved: [{ lineUid: "line-1", stepId: null, field: "assembly", status: "ambiguous",
			reason: "Confirm exterior double assembly." }],
	}, JSON.stringify(configuration),
	"Necesito dos unidades de doble puerta precolgadas para exterior; cantidad: 4.",
	)).toThrow(/slabs-only route for a pre-hung customer request/);
});

test("a named multiroom prehung schedule leaves stated handing and unstated jambs for native review", () => {
	const configuration = JSON.stringify({
		schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: ["jamb"] }],
		steps: [
			{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
				components: [["interior", "Interior pre-hung"]] },
			{ id: 2, uid: "jamb", title: "Jamb Size", selectionMode: "single",
				components: [["jamb-1", "4-9/16"]] },
		],
		visibilityByComponentUid: {},
	});
	const rooms = ["Bedroom Entry", "Powder Room", "Laundry Entry", "Hall Closet"];
	const source = rooms.map((room, index) => `${room} - ${index === 3 ? "Swing Out" : "R In"}`).join("\n");
	const seed = {
		schemaVersion: 2 as const,
		lineItems: rooms.map((room) => ({ uid: room.toLowerCase().replaceAll(" ", "-"), qty: 1,
			formSteps: [{ stepId: 1, prodUid: "interior" }] })),
		unresolved: [],
	};
	const reviewed = validateNewSalesFormSeedConfiguration(seed, configuration, source);
	expect(reviewed.unresolved.filter((issue) => issue.field === "jambSize"))
		.toHaveLength(4);
	expect(reviewed.unresolved.filter((issue) => issue.field === "jambSize" && issue.status === "unsupported"))
		.toHaveLength(4);
	expect(reviewed.unresolved.filter((issue) => issue.field === "handing" && issue.status === "unsupported"))
		.toHaveLength(3);
	expect(reviewed.unresolved.filter((issue) => issue.field === "handing" && issue.status === "ambiguous"))
		.toHaveLength(1);
});

test("unstated fire rating stays in review while stated slab size remains", () => {
	const config = JSON.stringify({
		schemaVersion: 1,
		routes: [{ itemTypeUid: "slabs", rootStepId: 1, stepUids: ["door"],
			config: { noHandle: true, hasSwing: false } }],
		steps: [
			{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
				components: [["slabs", "Door Slabs Only"]] },
			{ id: 2, uid: "door", title: "Door", selectionMode: "single",
				components: [
					["rated", "DOOR S.C FLUSH HARDBOARD PRIMED 1-3/4 (20MIN FIRE RATED)"],
					["unrated", "DOOR S.C FLUSH HARDBOARD PRIMED 1-3/8"],
				] },
		],
		visibilityByComponentUid: {},
	});
	const title = "DOOR S.C FLUSH HARDBOARD PRIMED 1-3/4 (20MIN FIRE RATED)";
	const description = "Smooth, white-primed, engineered solid-core interior door slab";
	const seed = {
		schemaVersion: 2 as const,
		lineItems: [{ uid: "slab-1", qty: 1, formSteps: [
			{ stepId: 1, prodUid: "slabs" }, { stepId: 2, prodUid: "rated" },
		], housePackageTool: { doors: [{ dimension: "2-6 x 6-8", totalQty: 1 }] } }],
		unresolved: [],
		interpretations: [{ lineUid: "slab-1", stepId: 2, field: "door",
			sourceText: description, selectedProdUid: "rated", selectedTitle: title,
			reason: "Selected configured Door." }],
	};
	const reviewed = validateNewSalesFormSeedConfiguration(seed, config,
		`${description}, 30 x 80 inches.`);
	expect(reviewed.lineItems[0]?.formSteps).toEqual([{ stepId: 1, prodUid: "slabs" }]);
	expect(reviewed.lineItems[0]?.housePackageTool?.doors).toEqual([
		{ dimension: "2-6 x 6-8", totalQty: 1 },
	]);
	expect(reviewed.interpretations).toEqual([]);
	expect(reviewed.unresolved).toContainEqual(expect.objectContaining({
		lineUid: "slab-1", stepId: 2, field: "door", status: "unsupported",
		reason: expect.stringContaining("fire rating"),
	}));
	const stated = validateNewSalesFormSeedConfiguration({ ...seed,
		interpretations: [{ ...seed.interpretations[0]!, sourceText: `${description}, 20-minute fire rated` }],
	}, config, `${description}, 20-minute fire rated, 30 x 80 inches.`);
	expect(stated.lineItems[0]?.formSteps).toContainEqual({ stepId: 2, prodUid: "rated" });
});

test("retains requested PVC brick moulding and sidelite when a partial exterior seed omits both", () => {
	const configuration = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "exterior", rootStepId: 1, stepUids: [] }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["exterior", "Exterior"]] }],
		visibilityByComponentUid: {} });
	const source = "Hurricane impact door and sidelite on right; 36-inch door panel, 69-5/8 x 80 overall. Please include PVC brick molding.";
	const seed = { schemaVersion: 2 as const,
		lineItems: [{ uid: "door", qty: 1,
			formSteps: [{ stepId: 1, prodUid: "exterior" }] }],
		unresolved: [] as Array<{ lineUid: null; stepId: null; field: string;
			status: "ambiguous"; reason: string }> };
	const reviewed = validateNewSalesFormSeedConfiguration(seed, configuration, source);
	expect(reviewed.unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "pvcBrickMoulding", status: "ambiguous" }),
		expect.objectContaining({ field: "sideliteAssembly", status: "ambiguous" }),
	]));
	expect(seed.unresolved).toEqual([]);
	const repeat = validateNewSalesFormSeedConfiguration(reviewed, configuration, source);
	expect(repeat.unresolved.filter((item) => item.field === "pvcBrickMoulding")).toHaveLength(1);
	expect(repeat.unresolved.filter((item) => item.field === "sideliteAssembly")).toHaveLength(1);
});

test("partial enumerated door schedule retains omitted rows as review notes", () => {
	const config = {
		schemaVersion: 1,
		routes: [
			{ itemTypeUid: "garage", rootStepId: 1, stepUids: ["door"],
				config: { noHandle: true, hasSwing: false } },
			{ itemTypeUid: "moulding", rootStepId: 1, stepUids: [] },
		],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["garage", "Garage DOOR"], ["moulding", "Mouldings"]] },
			{ id: 2, uid: "door", title: "Door", selectionMode: "single",
				components: [["panel", "Panel door"]] }],
		visibilityByComponentUid: {},
	};
	const source = "2/8 8/0 RH garage door\nBifold 2/0 8/0\nPocket 2/6 8/0\n2/8 8/8 RH\n24 unrelated stock pieces";
	const partial = {
		schemaVersion: 2 as const,
		lineItems: [
			{ uid: "garage", qty: 1, formSteps: [{ stepId: 1, prodUid: "garage" },
				{ stepId: 2, prodUid: "panel" }],
				housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 1 }] } },
			{ uid: "base", qty: 24, formSteps: [{ stepId: 1, prodUid: "moulding" }] },
		],
		unresolved: [] as Array<{ lineUid: null; stepId: null; field: string; status: "unsupported"; reason: string }>,
	};
	const partialDraft = validateNewSalesFormSeedConfiguration(partial, JSON.stringify(config), source);
	expect(partialDraft.lineItems).toHaveLength(2);
	expect(partialDraft.unresolved.filter((item) => item.field === "doorSchedule")).toEqual([
		expect.objectContaining({ status: "unsupported", reason: expect.stringContaining("Bifold 2/0 8/0") }),
		expect.objectContaining({ status: "unsupported", reason: expect.stringContaining("Pocket 2/6 8/0") }),
		expect.objectContaining({ status: "unsupported", reason: expect.stringContaining("2/8 8/8 RH") }),
	]);
	const reviewed = {
		...partial,
		unresolved: [
			{ lineUid: null, stepId: null, field: "doorSize", status: "unsupported" as const,
				reason: "Bifold 2/0 8/0 unavailable" },
			{ lineUid: null, stepId: null, field: "doorSize", status: "unsupported" as const,
				reason: "Pocket 2/6 8/0 unavailable" },
			{ lineUid: null, stepId: null, field: "doorSize", status: "unsupported" as const,
				reason: "2/8 x 8/8 RH unavailable" },
		],
	};
	expect(() => validateNewSalesFormSeedConfiguration(reviewed, JSON.stringify(config), source))
		.not.toThrow();
});

test("does not count bare 28 8/0 as a fifth explicit 2-8 door", () => {
	const config = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "garage", rootStepId: 1, stepUids: ["door"],
			config: { noHandle: true, hasSwing: false } }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["garage", "Garage DOOR"]] },
			{ id: 2, uid: "door", title: "Door", selectionMode: "single",
				components: [["panel", "Panel door"]] }],
		visibilityByComponentUid: {} });
	const source = "2/8 8/0 RH garage door\n2/8 8/0 RH\n28 8/0 RH\n2/8 8/0 LH\n2/8 8/0 RH";
	const line = { uid: "doors", qty: 5,
		formSteps: [{ stepId: 1, prodUid: "garage" }, { stepId: 2, prodUid: "panel" }],
		housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 5 }] } };
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 2, lineItems: [line], unresolved: [],
	}, config, source)).toThrow(/only 4 separate source rows explicitly state that size/);
	const configOnlyReview = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ ...line, qty: 4,
			housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 4 }] } }],
		unresolved: [{ lineUid: null, stepId: null, field: "doorConfiguration", status: "ambiguous",
			reason: "Confirm configuration for 28 8/0 RH" }],
	}, config, source);
	expect(configOnlyReview.unresolved).toContainEqual(expect.objectContaining({
		field: "width", status: "ambiguous", reason: expect.stringContaining("28 8/0 RH"),
	}));
	const jambOnlyReview = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ ...line, qty: 4,
			housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 4 }] } }],
		unresolved: [{ lineUid: null, stepId: null, field: "jambSize", status: "ambiguous",
			reason: "Confirm jamb size for 28 8/0 RH" }],
	}, config, source);
	expect(jambOnlyReview.unresolved.some((item) => item.field === "width"))
		.toBe(true);
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ ...line, qty: 4,
			housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 4 }] } }],
		unresolved: [{ lineUid: null, stepId: null, field: "width", status: "ambiguous",
			reason: "Confirm whether 28 8/0 RH means 28 inches or 2-8" }],
	}, config, source)).not.toThrow();
	const confirmed = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ ...line, qty: 5, housePackageTool: { doors: [
			{ dimension: "2-8 x 8-0", totalQty: 4 },
			{ dimension: "2-4 x 8-0", totalQty: 1 },
		] } }], unresolved: [],
	}, config, source, [], [{ question: "Confirm width for 28 8/0 RH",
		answer: "28 inches", field: "width" }]);
	expect(confirmed.unresolved.some((item) => item.field === "width")).toBe(false);
});

test("keeps explicitly counted Carrara accessories and pocket hardware reviewable", () => {
	const config = JSON.stringify({
		schemaVersion: 1,
		routes: [{ itemTypeUid: "garage", rootStepId: 1, stepUids: [] }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["garage", "Garage DOOR"]] }],
		visibilityByComponentUid: {},
	});
	const source = "Pocket door hardware\nDoor stop (6)\n24 tiras de base\n36 tiras de casing\n21 tiras de crown";
	const base = {
		schemaVersion: 2 as const,
		lineItems: [{ uid: "garage", qty: 1, formSteps: [{ stepId: 1, prodUid: "garage" }] }],
		unresolved: [] as Array<{ lineUid: null; stepId: null; field: string; status: "unsupported"; reason: string }>,
	};
	const missingAccessories = validateNewSalesFormSeedConfiguration(base, config, source);
	for (const [count, label] of [[6, "door stop"], [24, "base"],
		[36, "casing"], [21, "crown"]] as const) {
		expect(missingAccessories.unresolved).toContainEqual(expect.objectContaining({
			lineUid: null, field: "moulding", status: "ambiguous",
			reason: expect.stringContaining(`${count} ${label} pieces`),
		}));
	}
	expect(missingAccessories.unresolved.filter((item) =>
		item.field === "moulding")).toHaveLength(4);
	const genericReview = validateNewSalesFormSeedConfiguration({
		...base,
		unresolved: [
			{ lineUid: null, stepId: null, field: "Door stop quantity", status: "ambiguous" as const,
				reason: "Confirm door stop quantity (6)" },
			{ lineUid: null, stepId: null, field: "Moulding quantities", status: "ambiguous" as const,
				reason: "Confirm 24 base, 36 casing, 21 crown quantities" },
		],
	}, config, source);
	expect(genericReview.unresolved.filter((item) => item.field === "moulding")
		.map((item) => item.reason)).toEqual([
		"Confirm the catalog product for 6 door stop pieces; keep the customer's stated count.",
		"Confirm the catalog product for 24 base pieces; keep the customer's stated count.",
		"Confirm the catalog product for 36 casing pieces; keep the customer's stated count.",
		"Confirm the catalog product for 21 crown pieces; keep the customer's stated count.",
	]);
	const reviewed = {
		...base,
		unresolved: [
			{ lineUid: null, stepId: null, field: "doorStop", status: "unsupported" as const, reason: "Door stop (6)" },
			{ lineUid: null, stepId: null, field: "base", status: "unsupported" as const, reason: "24 tiras de base" },
			{ lineUid: null, stepId: null, field: "casing", status: "unsupported" as const, reason: "36 tiras de casing" },
			{ lineUid: null, stepId: null, field: "crown", status: "unsupported" as const, reason: "21 tiras de crown" },
			{ lineUid: null, stepId: null, field: "hardware", status: "unsupported" as const, reason: "Pocket door hardware" },
		],
	};
	expect(() => validateNewSalesFormSeedConfiguration(reviewed, config, source))
		.not.toThrow();
	const withoutHardware = { ...reviewed, unresolved: reviewed.unresolved.slice(0, -1) };
	const normalized = validateNewSalesFormSeedConfiguration(withoutHardware, config, source);
	expect(normalized.unresolved).toContainEqual(expect.objectContaining({
		lineUid: null,
		stepId: null,
		field: "pocketDoorHardware",
		status: "ambiguous",
	}));
});

test("townhouse room schedule keeps all sized rows and its blank room for review", () => {
	const config = JSON.stringify({
		schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: [] }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["interior", "Interior pre-hung"]] }],
		visibilityByComponentUid: {},
	});
	const source = "Garage Door Entry - 32\" x 96\"\nPowder Room - 32\" x 96\"\nMaster Water Closet - \nBedroom Entry - 36\" x 96\"\nCabana Bathroom - 30' x 96\"";
	const line = { uid: "rooms", qty: 4, formSteps: [{ stepId: 1, prodUid: "interior" }] };
	const seed = { schemaVersion: 2 as const, lineItems: [{ ...line, qty: 1 }], unresolved: [] };
	const partial = validateNewSalesFormSeedConfiguration(seed, config, source);
	expect(partial.unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "doorSchedule", reason: expect.stringContaining("Garage Door Entry") }),
		expect.objectContaining({ field: "doorSchedule", reason: expect.stringContaining("Powder Room") }),
		expect.objectContaining({ field: "room", status: "unsupported", reason: expect.stringContaining("Master Water Closet") }),
		expect.objectContaining({ field: "width", status: "unsupported", reason: expect.stringContaining("Cabana Bathroom") }),
	]));
	expect(validateNewSalesFormSeedConfiguration({ ...seed, lineItems: [line] }, config, source).unresolved)
		.toEqual(expect.arrayContaining([expect.objectContaining({ field: "doorSchedule" })]));
	const sizedRooms = [
		"Garage Door Entry - 32\" x 96\"",
		"Powder Room - 32\" x 96\"",
		"Bedroom Entry - 36\" x 96\"",
		"Cabana Bathroom - 30' x 96\" (width requires confirmation)",
	].map((reason) => ({ lineUid: null, stepId: null, field: "doorSize", status: "ambiguous" as const, reason }));
	expect(() => validateNewSalesFormSeedConfiguration({
		...seed, lineItems: [line],
		unresolved: [
			...Array.from({ length: 4 }, () => ({ ...sizedRooms[0]! })),
			{ lineUid: null, stepId: null, field: "room", status: "ambiguous" as const,
				reason: "Confirm size and product for Master Water Closet" },
		],
	}, config, source)).not.toThrow();
	expect(validateNewSalesFormSeedConfiguration({
		...seed, lineItems: [line], unresolved: sizedRooms,
	}, config, source).unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "room", status: "unsupported", reason: expect.stringContaining("Master Water Closet") }),
	]));
	expect(validateNewSalesFormSeedConfiguration({
		...seed, lineItems: [line],
		unresolved: [...sizedRooms, { lineUid: null, stepId: null, field: "room",
			status: "unsupported" as const, reason: "Master Water Closet needs dimensions" }],
	}, config, source).unresolved.filter((item) => item.field === "room")).toHaveLength(1);
	expect(validateNewSalesFormSeedConfiguration({
		...seed, lineItems: [line],
		unresolved: [...sizedRooms.slice(0, 3), { ...sizedRooms[3]!, status: "unsupported" as const },
			{ lineUid: null, stepId: null, field: "room", status: "ambiguous" as const,
				reason: "Confirm size and product for Master Water Closet" }],
	}, config, source).unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "width", status: "unsupported", reason: expect.stringContaining("Cabana Bathroom") }),
	]));
	expect(() => validateNewSalesFormSeedConfiguration({
		...seed,
		lineItems: [line],
		unresolved: [...sizedRooms, { lineUid: null, stepId: null, field: "room", status: "ambiguous" as const,
			reason: "Confirm size and product for Master Water Closet" }],
	}, config, `${source}\n\nRepresentative clarifications:\nBedroom 5 Entry - 24 x 80`, [], [], source))
		.not.toThrow();
});

test("the sanitized townhouse schedule cannot trade one room's review for another", () => {
	const fixture = readFileSync(resolve(import.meta.dir,
		"../../../../.brain/evaluations/sales-request-generation/cases/townhouse-multifloor-door-package/input.md"), "utf8");
	const source = fixture.slice(fixture.indexOf("**1st Floor:**"), fixture.indexOf("Let me know"));
	const roomNames = [
		"Garage Door Entry", "AC Garage Door", "Powder Room", "Hall Closet",
		"Master Bedroom Entry", "Master Closet 1", "Master Closet 2",
		"Hallway Closet", "Laundry Entry", "Bedroom 2 Entry",
		"Bedroom 2 Linen", "Bedroom 2 Closet", "Bedroom 2 Bathroom",
		"AC Hallway", "Bedroom 3 Entry", "Bedroom 3 Closet 1",
		"Bedroom 3 Closet 2", "Bedroom 3 Bathroom", "Bedroom 4 Entry",
		"Bedroom 4 Closet", "Bedroom 4 Bathroom", "Cabana Bathroom",
	];
	const reviews = roomNames.map((name) => ({
		lineUid: null, stepId: null, field: "doorSize", status: "ambiguous" as const,
		reason: source.split(/\r?\n/).find((row) => row.trim().startsWith(`${name} -`))?.trim() ?? "",
	}));
	expect(reviews).toHaveLength(22);
	expect(reviews.every((review) => Boolean(review.reason))).toBe(true);
	const config = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: ["door"] }],
		steps: [
			{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
				components: [["interior", "Interior pre-hung"]] },
			{ id: 2, uid: "door", title: "Door", selectionMode: "single",
				components: [["panel", "Panel"]] },
		],
		visibilityByComponentUid: {} });
	const seed = { schemaVersion: 2 as const, lineItems: [], unresolved: [
		...reviews, { lineUid: null, stepId: null, field: "room", status: "ambiguous" as const,
			reason: "Confirm size and product for Master Water Closet" },
	] };
	expect(() => validateNewSalesFormSeedConfiguration(seed, config, source)).not.toThrow();
	const laundryRow = reviews.find((review) => review.reason.startsWith("Laundry Entry -"))!;
	const handingReview = { ...laundryRow, field: "handing",
		reason: "Laundry Entry - 34\" x 96\": confirm left/right handing before creating this door." };
	const grounded = validateNewSalesFormSeedConfiguration({ ...seed,
		unresolved: seed.unresolved.map((review) => review === laundryRow ? handingReview : review),
	}, config, source);
	expect(grounded.unresolved.some((review) => review.field === "doorSchedule" &&
		review.reason.includes("Laundry Entry"))).toBe(false);
	const wrongRoom = validateNewSalesFormSeedConfiguration({ ...seed,
		unresolved: seed.unresolved.map((review) => review === laundryRow
			? { ...handingReview, reason: "Garage Door Entry - 34\" x 96\": confirm handing." }
			: review),
	}, config, source);
	expect(wrongRoom.unresolved).toContainEqual(expect.objectContaining({
		field: "doorSchedule", status: "unsupported", reason: expect.stringContaining("Laundry Entry"),
	}));
	expect(validateNewSalesFormSeedConfiguration({ ...seed,
		unresolved: seed.unresolved.map((review) => review.reason.startsWith("Laundry Entry -")
			? { ...reviews[0]! } : review),
	}, config, source).unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "doorSchedule", status: "unsupported", reason: expect.stringContaining("Laundry Entry") }),
	]));
	const laundryLine = (dimension: string) => ({ uid: "laundry-entry", qty: 1,
		formSteps: [{ stepId: 1, prodUid: "interior" }, { stepId: 2, prodUid: "panel" }],
		housePackageTool: { doors: [{ dimension, lhQty: 0, rhQty: 1 }] } });
	const withoutLaundryReview = seed.unresolved.filter((review) =>
		!review.reason.startsWith("Laundry Entry -"));
	expect(() => validateNewSalesFormSeedConfiguration({ ...seed,
		lineItems: [laundryLine("2-10 x 8-0")], unresolved: withoutLaundryReview,
	}, config, source)).not.toThrow();
	expect(() => validateNewSalesFormSeedConfiguration({ ...seed,
		lineItems: [laundryLine("2-8 x 8-0")], unresolved: withoutLaundryReview,
	}, config, source)).toThrow(/Laundry Entry/);
});

test("keeps an interior closet astragal for review without selecting its exterior-only step", () => {
	const config = JSON.stringify({
		schemaVersion: 1,
		routes: [
			{ itemTypeUid: "interior", rootStepId: 1, stepUids: [] },
			{ itemTypeUid: "exterior", rootStepId: 1, stepUids: ["astragal"] },
		],
		steps: [
			{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
				components: [["interior", "Interior pre-hung"], ["exterior", "Exterior"]] },
			{ id: 219, uid: "astragal", title: "T-ASTRAGAL", selectionMode: "single",
				components: [["t", "T Astragal"]] },
		],
		visibilityByComponentUid: {},
	});
	const line = { uid: "hall-closet", qty: 2, formSteps: [
		{ stepId: 1, prodUid: "interior" }, { stepId: 219, prodUid: "t" },
	] };
	const source = 'Hall Closet - 48" x 96" (2 - 24" Doors w/ T Astragal) Swing Out';
	const result = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2, lineItems: [line], unresolved: [],
	}, config, source);
	expect(result.lineItems[0]?.formSteps).toEqual([{ stepId: 1, prodUid: "interior" }]);
	expect(result.unresolved).toContainEqual({
		lineUid: "hall-closet", stepId: null, field: "astragal", status: "ambiguous",
		reason: "T-Astragal is requested for Hall Closet, but the Interior pre-hung route does not expose it. Confirm a compatible route or manual handling.",
	});
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 2, lineItems: [line], unresolved: [],
	}, config, 'Hall Closet - 48" x 96" (2 - 24" Doors) Swing Out'))
		.toThrow(/outside the Interior pre-hung route/);
});

test("keeps the other rooms when a double closet is mapped as two leaf-size openings", () => {
	const source = 'Hall Closet - 48" x 96" (2 - 24" Doors w/ T Astragal) Swing Out\nPowder Room - 32" x 96"';
	const config = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: [] }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["interior", "Interior pre-hung"]] }],
		visibilityByComponentUid: {} });
	const seed = { schemaVersion: 2 as const,
		lineItems: [
			{ uid: "hall-closet", qty: 2, formSteps: [{ stepId: 1, prodUid: "interior" }],
				housePackageTool: { doors: [{ dimension: "2-0 x 8-0", totalQty: 2 }] } },
			{ uid: "powder-room", qty: 1, formSteps: [{ stepId: 1, prodUid: "interior" }] },
		],
		unresolved: [{ lineUid: "hall-closet", stepId: null, field: "T-Astragal",
			status: "unsupported" as const, reason: "Review T-Astragal for Hall Closet." }],
		interpretations: [{ lineUid: "hall-closet", stepId: 1,
			sourceText: 'Hall Closet - 48" x 96"', selectedProdUid: "interior",
			selectedTitle: "Interior pre-hung" }],
	};
	const result = validateNewSalesFormSeedConfiguration(seed, config, source);
	expect(result.lineItems.map((line) => line.uid)).toEqual(["powder-room"]);
	expect(result.interpretations).toEqual([]);
	expect(result.unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ lineUid: null, stepId: null, field: "T-Astragal", status: "unsupported" }),
		expect.objectContaining({ lineUid: null, stepId: null, field: "doorSchedule",
			status: "unsupported", reason: expect.stringContaining('48" x 96" (2 - 24" Doors') }),
	]));
});

test("keeps supported rooms while moving an inferred apostrophe-width room to review", () => {
	const source = `Powder Room - 32" x 96"\nCabana Bathroom - 30' x 96" - PVC Louvered R In`;
	const config = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: [] }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["interior", "Interior pre-hung"]] }],
		visibilityByComponentUid: {} });
	const seed = { schemaVersion: 2 as const,
		lineItems: [
			{ uid: "powder-room", qty: 1, formSteps: [{ stepId: 1, prodUid: "interior" }] },
			{ uid: "line-2", qty: 1, formSteps: [{ stepId: 1, prodUid: "interior" }],
				housePackageTool: { doors: [{ dimension: "2-6 x 8-0", totalQty: 1 }] } },
		],
		unresolved: [],
		interpretations: [{ lineUid: "line-2", stepId: 1,
			sourceText: `Cabana Bathroom - 30' x 96"`, selectedProdUid: "interior",
			selectedTitle: "Interior pre-hung" }],
	};
	const result = validateNewSalesFormSeedConfiguration(seed, config, source);
	expect(result.lineItems.map((line) => line.uid)).toEqual(["powder-room"]);
	expect(result.interpretations).toEqual([]);
	expect(result.unresolved).toContainEqual(expect.objectContaining({
		lineUid: null, stepId: null, field: "width", status: "unsupported",
		reason: expect.stringContaining("Cabana Bathroom"),
	}));
});

test("ordered door schedule does not turn bare width or incompatible pocket hardware into a sale", () => {
	const source = ["2/8 8/0 RH", "2/8 8/0 LH", "28 8/0 RH", "Pocket 2/6 8/0",
		"Pocket door hardware"].join("\n");
	const configuration = JSON.stringify({ schemaVersion: 1,
		routes: [{ itemTypeUid: "interior", rootStepId: 1, stepUids: ["hardware", "door"],
			config: { noHandle: false } }],
		steps: [{ id: 1, uid: "type", title: "Item Type", selectionMode: "single",
			components: [["interior", "Interior pre-hung"]] },
			{ id: 2, uid: "hardware", title: "Hardware", selectionMode: "single",
				components: [] },
			{ id: 3, uid: "door", title: "Door", selectionMode: "single",
				components: [["door", "Flush Door"]] }],
		visibilityByComponentUid: {} });
	const door = (uid: string, dimension: string, handed: "lhQty" | "rhQty" | "totalQty") => ({
		uid, qty: 1, formSteps: [{ stepId: 1, prodUid: "interior" },
			{ stepId: 3, prodUid: "door" }],
		housePackageTool: { doors: [{ dimension, [handed]: 1,
			...(handed === "lhQty" ? { rhQty: 0 } : handed === "rhQty" ? { lhQty: 0 } : {}) }] },
	});
	const seed = { schemaVersion: 2 as const,
		lineItems: [door("line-1", "2-8 x 8-0", "rhQty"),
			door("line-2", "2-8 x 8-0", "lhQty"),
			door("line-3", "2-8 x 8-0", "rhQty"),
			door("line-4-pocket", "2-6 x 8-0", "totalQty"),
			{ uid: "line-hardware-pocket", qty: 1,
				formSteps: [{ stepId: 1, prodUid: "interior" },
					{ stepId: 2, prodUid: "missing-hardware" }] },
		], unresolved: [],
	};
	const result = validateNewSalesFormSeedConfiguration(seed, configuration, source);
	expect(result.lineItems.reduce((count, line) => count +
		(line.housePackageTool?.doors ?? []).reduce((total, row) => total +
			("totalQty" in row ? row.totalQty : row.lhQty + row.rhQty), 0), 0)).toBe(2);
	expect(result.lineItems.every((line) => !/line-3|line-4|hardware-pocket/.test(line.uid))).toBe(true);
	expect(result.unresolved).toEqual(expect.arrayContaining([
		expect.objectContaining({ field: "width", status: "ambiguous",
			reason: expect.stringContaining("28 8/0") }),
		expect.objectContaining({ field: "doorSchedule", status: "unsupported",
			reason: expect.stringContaining("Pocket 2/6 8/0") }),
		expect.objectContaining({ field: "pocketHardware", status: "unsupported" }),
	]));
	expect(() => validateNewSalesFormSeedConfiguration({ ...seed,
		lineItems: seed.lineItems.map((line) =>
			line.uid === "line-3" ? { ...line, uid: "unlinked-line" } : line),
	}, configuration, source)).toThrow(/door schedule selects|HPT quantity shape/);
});

const configuration = {
	componentColumns: ["uid", "title"],
	routes: [
		{
			itemTypeUid: "exterior",
			rootStepId: 1,
			stepUids: ["frame", "door"],
		},
	],
	schemaVersion: 1,
	steps: [
		{
			id: 1,
			uid: "type",
			title: "Type",
			selectionMode: "single",
			components: [["exterior", "Exterior"]],
		},
		{
			id: 2,
			uid: "frame",
			title: "Frame",
			selectionMode: "single",
			components: [["pvc", "PVC"]],
		},
		{
			id: 3,
			uid: "door",
			title: "Door",
			selectionMode: "multiple",
			components: [
				["panel", "Panel"],
				["lite", "Lite"],
			],
		},
	],
	visibilityByComponentUid: {
		exterior: { variations: [] },
		pvc: { variations: [] },
		panel: { variations: [] },
		lite: {
			variations: [
				{
					rules: [
						{
							stepUid: "frame",
							operator: "is",
							componentsUid: ["pvc"],
						},
					],
				},
			],
		},
	},
};

const input = {
	text: "One exterior door",
	images: [],
	signal: new AbortController().signal,
	configurationJson: JSON.stringify(configuration),
	configurationRevision: "test-1",
};

const validSeed = {
	schemaVersion: 1,
	lineItems: [
		{
			uid: "line-1",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "exterior" },
				{ stepId: 2, prodUid: "pvc" },
				{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
			],
			housePackageTool: {
				doors: [
					{
						dimension: "3-0 x 6-8",
						swing: "",
						lhQty: 1,
						rhQty: 0,
					},
				],
			},
		},
	],
	unresolved: [],
} as const;

const mouldingConfiguration = {
	componentColumns: ["uid", "title"],
	routes: [
		{
			itemTypeUid: "mouldings",
			rootStepId: 1,
			stepUids: ["moulding", "line-item"],
		},
	],
	schemaVersion: 1,
	steps: [
		{
			id: 1,
			uid: "type",
			title: "Item Type",
			selectionMode: "single",
			components: [["mouldings", "Mouldings"]],
		},
		{
			id: 215,
			uid: "moulding",
			title: "Moulding",
			selectionMode: "multiple",
			components: [
				["baseboard-16", "BASEBOARD WM713 3-1/4 X 9/16 X 16"],
				["casing-17", "CASING 11/16 X 2-1/4 X 17"],
			],
		},
		{
			id: 217,
			uid: "line-item",
			title: "Line Item",
			selectionMode: "single",
			components: [],
		},
	],
	visibilityByComponentUid: {},
};

const mouldingLinearFeetSeed = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "moulding-line",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "mouldings" },
				{
					stepId: 215,
					meta: { selectedProdUids: ["baseboard-16"] },
				},
			],
			meta: {
				mouldingRows: [
					{
						uid: "baseboard-16",
						calculation: {
							linearFeet: 400,
							pieceLength: 16,
							wastePercentage: 10,
						},
					},
				],
			},
		},
	],
	unresolved: [],
} as const;

test("returns a validated native new-sales-form seed", async () => {
	const result = await generateNewSalesFormSeed(input, async () => ({
		output: validSeed,
		provider: "anthropic",
		model: "configured-model",
	}));

	expect(result.seed).toEqual(validSeed);
	expect(result.configurationRevision).toBe("test-1");
	expect(result.promptVersion).toBe(SALES_REQUEST_PROMPT_VERSION);
	expect(result.provider).toBe("anthropic");
	expect(result.model).toBe("configured-model");
});

test("validates and normalizes a source-grounded moulding linear-foot row", async () => {
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text: "BASEBOARD WM713 3-1/4 x 9/16 x 16, 400 linear feet including 10% waste",
			configurationJson: JSON.stringify(mouldingConfiguration),
		},
		async () => ({ output: mouldingLinearFeetSeed }),
	);

	expect(result.seed.lineItems[0]).toMatchObject({
		qty: 28,
		meta: {
			mouldingRows: [
				{
					uid: "baseboard-16",
					qty: 28,
					calculation: {
						linearFeet: 400,
						pieceLength: 16,
						wastePercentage: 10,
					},
				},
			],
		},
	});
	// Applying a normalized preview validates retained source facts, not the derived piece count.
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16, 400 linear feet including 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: result.seed }),
		),
	).resolves.toMatchObject({ seed: result.seed });
});

test("accepts source-grounded direct moulding piece quantities", async () => {
	const seed = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 24,
				meta: { mouldingRows: [{ uid: "baseboard-16", qty: 24 }] },
			},
		],
	};

	for (const text of [
		"24 pieces of BASEBOARD WM713 3-1/4 x 9/16 x 16",
		"24 tiras de BASEBOARD WM713 3-1/4 x 9/16 x 16",
		"24 pieces of WM713 baseboard",
	]) {
		await expect(
			generateNewSalesFormSeed(
				{
					...input,
					text,
					configurationJson: JSON.stringify(mouldingConfiguration),
				},
				async () => ({ output: seed }),
			),
		).resolves.toMatchObject({ seed });
	}
});

test("rejects moulding rows outside the Mouldings route or not selected in its step", async () => {
	await expect(
		generateNewSalesFormSeed(input, async () => ({
			output: {
				...validSeed,
				schemaVersion: 2,
				lineItems: [
					{
						...validSeed.lineItems[0],
						housePackageTool: undefined,
						meta: { mouldingRows: [{ uid: "panel", qty: 1 }] },
					},
				],
			},
		})),
	).rejects.toThrow("outside a Mouldings route");

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "24 pieces of casing",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({
				output: {
					...mouldingLinearFeetSeed,
					lineItems: [
						{
							...mouldingLinearFeetSeed.lineItems[0],
							qty: 24,
							meta: {
								mouldingRows: [{ uid: "casing-17", qty: 24 }],
							},
						},
					],
				},
			}),
		),
	).rejects.toThrow("must exactly match its selected Moulding components");
});

test("rejects moulding calculator facts absent from the request or component", async () => {
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: mouldingLinearFeetSeed }),
		),
	).rejects.toThrow("linear feet must be stated");

	const wrongLength = structuredClone(mouldingLinearFeetSeed);
	const row = wrongLength.lineItems[0]?.meta.mouldingRows[0];
	if (!row) throw new Error("Expected moulding fixture row");
	row.calculation.pieceLength = 12;
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16: 400 linear feet with 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: wrongLength }),
		),
	).rejects.toThrow("piece length must match");
});

test("accepts a defensible moulding interpretation and still rejects an unexplained guess", async () => {
	const configurationWithCatalogWhitespace = structuredClone(
		mouldingConfiguration,
	);
	configurationWithCatalogWhitespace.steps[1]!.components[0]![1] =
		"BASEBOARD WM713 3-1/4 X 9/16 X 16  ";
	const interpreted = {
		...mouldingLinearFeetSeed,
		interpretations: [
			{
				lineUid: "moulding-line",
				stepId: 215,
				field: "moulding",
				sourceText: "baseboard",
				selectedProdUid: "baseboard-16",
				selectedTitle: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
				reason:
					"The configured baseboard is the only compatible visible profile.",
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "400 linear feet for baseboard with 10% waste",
				configurationJson: JSON.stringify(configurationWithCatalogWhitespace),
			},
			async () => ({ output: interpreted }),
		),
	).resolves.toMatchObject({
		seed: { interpretations: interpreted.interpretations },
	});

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "400 linear feet for baseboard with 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: mouldingLinearFeetSeed }),
		),
	).rejects.toThrow("Moulding component");
});

test("rejects interpretation provenance that is not current source and catalog data", async () => {
	const interpreted = {
		...mouldingLinearFeetSeed,
		interpretations: [
			{
				lineUid: "moulding-line",
				stepId: 215,
				field: "moulding",
				sourceText: "invented phrase",
				selectedProdUid: "baseboard-16",
				selectedTitle: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
				reason: "Closest configured option.",
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "400 linear feet for baseboard with 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: interpreted }),
		),
	).rejects.toThrow("source text must be quoted");

	interpreted.interpretations[0]!.sourceText = "baseboard";
	interpreted.interpretations[0]!.selectedTitle = "STALE TITLE";
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "400 linear feet for baseboard with 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: interpreted }),
		),
	).rejects.toThrow("current configured component title");
});

test("does not mistake a moulding title dimension for a direct piece quantity", async () => {
	const seed = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 16,
				meta: { mouldingRows: [{ uid: "baseboard-16", qty: 16 }] },
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: seed }),
		),
	).rejects.toThrow("Moulding quantity 16");
});

test("binds each moulding quantity to its own product request segment", async () => {
	const seed = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 60,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: {
							selectedProdUids: ["baseboard-16", "casing-17"],
						},
					},
				],
				meta: {
					mouldingRows: [
						{ uid: "baseboard-16", qty: 24 },
						{ uid: "casing-17", qty: 36 },
					],
				},
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: [
					"36 pieces of BASEBOARD WM713 3-1/4 x 9/16 x 16",
					"24 pieces of CASING 11/16 x 2-1/4 x 17",
				].join("\n"),
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: seed }),
		),
	).rejects.toThrow("Moulding quantity 24");
});

test("keeps a counted door stop when its catalog interpretation quotes the whole source line", () => {
	const title = 'WM916 DOOR STOP 3/8 X 1-3/8 X 99"';
	const configuration = structuredClone(mouldingConfiguration);
	configuration.steps[1]?.components.push(["door-stop", title]);
	const source = "Door stop (6)";
	const seed = {
		schemaVersion: 2 as const,
		lineItems: [{ uid: "line-doorstop", qty: 6,
			formSteps: [{ stepId: 1, prodUid: "mouldings" },
				{ stepId: 215, meta: { selectedProdUids: ["door-stop"] } }],
			meta: { mouldingRows: [{ uid: "door-stop", qty: 6 }] },
		}],
		unresolved: [],
		interpretations: [{ lineUid: "line-doorstop", stepId: 215,
			field: "Moulding", sourceText: source, selectedProdUid: "door-stop",
			selectedTitle: title, reason: "Current catalog match" }],
	};
	expect(validateNewSalesFormSeedConfiguration(seed, JSON.stringify(configuration), source)
		.lineItems[0]?.qty).toBe(6);
	expect(() => validateNewSalesFormSeedConfiguration({ ...seed, interpretations:
		[{ ...seed.interpretations[0]!, sourceText: "Door stop (4)" }] },
		JSON.stringify(configuration), "Door stop (4)\nCasing (6)"))
		.toThrow("Moulding quantity 6");
});

test("requires stated waste and a catalog-encoded piece length", async () => {
	const omittedWaste = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				meta: {
					mouldingRows: [
						{
							uid: "baseboard-16",
							calculation: { linearFeet: 400, pieceLength: 16 },
						},
					],
				},
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16: 400 linear feet with 10% waste",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: omittedWaste }),
		),
	).rejects.toThrow("must be included");

	const dimensionlessConfiguration = structuredClone(mouldingConfiguration);
	dimensionlessConfiguration.steps[1]?.components.push([
		"attic-access",
		"ATTIC ACCESS KIT",
	]);
	const dimensionlessSeed = structuredClone(mouldingLinearFeetSeed);
	const dimensionlessLine = dimensionlessSeed.lineItems[0];
	if (!dimensionlessLine) throw new Error("Expected moulding fixture line");
	dimensionlessLine.formSteps[1] = {
		stepId: 215,
		meta: { selectedProdUids: ["attic-access"] },
	};
	dimensionlessLine.meta.mouldingRows = [
		{
			uid: "attic-access",
			calculation: { linearFeet: 400, pieceLength: 16 },
		},
	];
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "ATTIC ACCESS KIT: 400 linear feet",
				configurationJson: JSON.stringify(dimensionlessConfiguration),
			},
			async () => ({ output: dimensionlessSeed }),
		),
	).rejects.toThrow("piece length must match");
});

test("accepts native totalQty rows only for an effective no-handle route", async () => {
	const slabConfiguration = structuredClone(configuration);
	const slabRoute = slabConfiguration.routes[0];
	if (!slabRoute) throw new Error("Expected route fixture");
	(slabRoute as typeof slabRoute & { config?: object }).config = {
		noHandle: true,
		hasSwing: false,
	};
	const slabSeed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "slabs",
				qty: 14,
				formSteps: validSeed.lineItems[0].formSteps,
				housePackageTool: {
					doors: [
						{ dimension: "2-4 x 6-8", totalQty: 1 },
						{ dimension: "2-10 x 6-8", totalQty: 11 },
						{ dimension: "3-0 x 6-8", totalQty: 2 },
					],
				},
			},
		],
		unresolved: [],
	} as const;

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(slabConfiguration),
			},
			async () => ({ output: slabSeed }),
		),
	).resolves.toMatchObject({ seed: slabSeed });
});

test("canonicalizes source-grounded inch dimensions through the selected Height variation", async () => {
	const sizedConfiguration = structuredClone(
		configuration,
	) as typeof configuration & {
		routes: Array<(typeof configuration.routes)[number] & { config?: object }>;
	};
	const sizedRoute = sizedConfiguration.routes[0];
	if (!sizedRoute) throw new Error("Expected route fixture");
	sizedConfiguration.routes[0] = {
		...sizedRoute,
		stepUids: ["height", "frame", "door"],
		config: { noHandle: true, hasSwing: false },
	};
	sizedConfiguration.steps.push({
		id: 4,
		uid: "height",
		title: "Height",
		selectionMode: "single",
		components: [["height-68", "6-8"]],
		doorSizeVariation: [
			{
				rules: [
					{
						stepUid: "height",
						operator: "is",
						componentsUid: ["height-68"],
					},
				],
				widthList: ["2-4", "2-10", "3-0"],
			},
		],
	} as (typeof sizedConfiguration.steps)[number]);
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "slabs",
				qty: 14,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 4, prodUid: "height-68" },
					{ stepId: 2, prodUid: "pvc" },
					{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
				],
				housePackageTool: {
					doors: [
						{ dimension: "28 x 80", totalQty: 1 },
						{ dimension: "34 x 80", totalQty: 11 },
						{ dimension: "36 x 80", totalQty: 1 },
						{ dimension: "3-0 x 6-8", totalQty: 1 },
					],
				},
			},
		],
		unresolved: [],
	} as const;
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text: "One 28” × 80”, eleven 34” × 80”, and two 36” × 80” door slabs",
			configurationJson: JSON.stringify(sizedConfiguration),
		},
		async () => ({ output: seed }),
	);

	expect(result.seed.lineItems[0]?.housePackageTool?.doors).toEqual([
		{ dimension: "2-4 x 6-8", totalQty: 1 },
		{ dimension: "2-10 x 6-8", totalQty: 11 },
		{ dimension: "3-0 x 6-8", totalQty: 2 },
	]);
	const unavailableConfiguration = structuredClone(sizedConfiguration);
	const unavailableHeight = unavailableConfiguration.steps.find((step) => step.id === 4)!;
	unavailableHeight.doorSizeVariation = [{
		rules: [{ stepUid: "height", operator: "is", componentsUid: ["other-height"] }],
		widthList: ["2-4"],
	}];
	const oneDoor = {
		...seed,
		lineItems: [{ ...seed.lineItems[0]!, qty: 1,
			housePackageTool: { doors: [{ dimension: "28 x 80", totalQty: 1 }] } }],
	};
	const reviewedSize = validateNewSalesFormSeedConfiguration(oneDoor,
		JSON.stringify(unavailableConfiguration), "One 28 x 80 door slab");
	expect(reviewedSize.lineItems[0]?.housePackageTool).toBeUndefined();
	expect(reviewedSize.lineItems[0]?.qty).toBe(1);
	expect(reviewedSize.unresolved).toContainEqual(expect.objectContaining({
		lineUid: "slabs", field: "doorSize", status: "unsupported",
		reason: expect.stringContaining("28 x 80"),
	}));
	const missingDoorSeed = {
		...oneDoor,
		lineItems: [{ ...oneDoor.lineItems[0]!, formSteps: oneDoor.lineItems[0]!
			.formSteps.filter((step) => step.stepId !== 3) }],
		unresolved: [{ lineUid: "slabs", stepId: null, field: "height",
			status: "ambiguous" as const, reason: "Confirm height" }],
	};
	const missingDoorReview = validateNewSalesFormSeedConfiguration(missingDoorSeed,
		JSON.stringify(unavailableConfiguration), "One 28 x 80 door slab");
	expect(missingDoorReview.lineItems[0]?.housePackageTool).toBeUndefined();
	expect(missingDoorReview.unresolved.filter((item) =>
		item.lineUid === "slabs" && item.field === "door")).toEqual([
		expect.objectContaining({ reason: expect.stringContaining("28 x 80") }),
	]);
	expect(missingDoorReview.unresolved.some((item) => item.field === "doorSize"))
		.toBe(false);
	const townhouseConfiguration = structuredClone(sizedConfiguration);
	const townhouseHeight = townhouseConfiguration.steps.find((step) => step.id === 4)!;
	townhouseHeight.components.push(["height-80", "8-0"]);
	townhouseHeight.doorSizeVariation = [{
		rules: [{ stepUid: "height", operator: "is", componentsUid: ["height-80"] }],
		widthList: ["2-4"],
	}];
	const townhouseSeed = {
		schemaVersion: 2 as const,
		lineItems: [{
			uid: "bedroom-3-closet-1", qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "exterior" },
				{ stepId: 4, prodUid: "height-80" },
				{ stepId: 2, prodUid: "pvc" },
				{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
			],
			housePackageTool: { doors: [{ dimension: "2-4 x 8-0", totalQty: 1 }] },
		}],
		unresolved: [],
	};
	expect(() => validateNewSalesFormSeedConfiguration(
		townhouseSeed, JSON.stringify(townhouseConfiguration),
		'Bedroom 3 Closet 1 - 28" x 96" x 1-3/4 Louvered R In',
	)).not.toThrow();
	expect(() => validateNewSalesFormSeedConfiguration(
		townhouseSeed, JSON.stringify(townhouseConfiguration),
		`Cabana Bathroom - 28' x 96" - PVC Louvered R In`,
	)).toThrow(/Door dimension 2-4 x 8-0 must be stated/);
	const unavailableWidth = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{
			...seed.lineItems[0]!,
			qty: 1,
			housePackageTool: { doors: [{ dimension: "2-8 x 8-8", totalQty: 1 }] },
		}],
		unresolved: [],
	}, JSON.stringify(sizedConfiguration), "One 2-8 x 8-8 door slab; another door is 6-8 high");
	expect(unavailableWidth.lineItems[0]?.housePackageTool).toBeUndefined();
	expect(unavailableWidth.unresolved).toContainEqual(expect.objectContaining({
		lineUid: "slabs", field: "doorSize", status: "unsupported",
		reason: expect.stringContaining("2-8 x 8-8"),
	}));
	expect(() => validateNewSalesFormSeedConfiguration({
		schemaVersion: 2,
		lineItems: [{ ...seed.lineItems[0]!, qty: 1,
			housePackageTool: { doors: [{ dimension: "2-8 x 8-8", totalQty: 1 }] } }],
		unresolved: [],
	}, JSON.stringify(sizedConfiguration), "One 2-4 x 6-8 door slab"))
		.toThrow(/2-8 x 8-8.*Available dimensions.*2-4 x 6-8/);
	const widthOnly = "One 28” door slab, eleven 34” door slabs, and two 36” door slabs";
	await expect(generateNewSalesFormSeed({
		...input, text: widthOnly,
		configurationJson: JSON.stringify(sizedConfiguration),
	}, async () => ({ output: seed }))).rejects.toThrow(/Height|dimension/);
	const confirmedHeight = await generateNewSalesFormSeed({
		...input, text: widthOnly,
		clarifications: [{ question: "What height applies to the listed doors?", answer: "6-8", field: "height" }],
		configurationJson: JSON.stringify(sizedConfiguration),
	}, async () => ({ output: seed }));
	expect(confirmedHeight.seed.lineItems[0]?.housePackageTool?.doors).toEqual(
		result.seed.lineItems[0]?.housePackageTool?.doors,
	);
	const architectural = await generateNewSalesFormSeed(
		{
			...input,
			text: "One 2/4 6/8, eleven 2/10 6/8, and two 3/0 6/8 door slabs",
			configurationJson: JSON.stringify(sizedConfiguration),
		},
		async () => ({ output: seed }),
	);
	expect(architectural.seed.lineItems[0]?.housePackageTool?.doors).toEqual(
		result.seed.lineItems[0]?.housePackageTool?.doors,
	);
	const thickness = await generateNewSalesFormSeed(
		{
			...input,
			text: "One 28 x 1 3/4 x 80, eleven 34 x 1.75 x 80, and two 36 x 1 3/4 x 80 door slabs",
			configurationJson: JSON.stringify(sizedConfiguration),
		},
		async () => ({ output: seed }),
	);
	expect(thickness.seed.lineItems[0]?.housePackageTool?.doors).toEqual(
		result.seed.lineItems[0]?.housePackageTool?.doors,
	);
	const heightStep = sizedConfiguration.steps.find((step) => step.id === 4)!;
	heightStep.components.push(["height-80", "8-0"]);
	const partial = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "wrong-height",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 4, prodUid: "height-80" },
				],
			},
		],
		unresolved: [
			{
				lineUid: "wrong-height",
				stepId: 3,
				field: "door",
				status: "unsupported",
				reason: "Product unavailable",
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "One 36 x 1 3/4 x 80 door",
				configurationJson: JSON.stringify(sizedConfiguration),
			},
			async () => ({ output: partial }),
		),
	).rejects.toThrow("contradicts the dimensions stated");
});

test("rejects handed HPT rows on an effective no-handle route", async () => {
	const slabConfiguration = structuredClone(configuration);
	const slabRoute = slabConfiguration.routes[0];
	if (!slabRoute) throw new Error("Expected route fixture");
	(slabRoute as typeof slabRoute & { config?: object }).config = {
		noHandle: true,
		hasSwing: false,
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(slabConfiguration),
			},
			async () => ({ output: validSeed }),
		),
	).rejects.toThrow("wrong HPT quantity shape");
});

test("rejects totalQty rows on a handled route", async () => {
	const seed = {
		...validSeed,
		lineItems: [
			{
				...validSeed.lineItems[0],
				housePackageTool: {
					doors: [{ dimension: "3-0 x 6-8", totalQty: 1 }],
				},
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(input, async () => ({ output: seed })),
	).rejects.toThrow("wrong HPT quantity shape");
});

test("rejects swing facts when the handled route disables swing", async () => {
	const noSwingConfiguration = structuredClone(configuration);
	const route = noSwingConfiguration.routes[0];
	if (!route) throw new Error("Expected route fixture");
	(route as typeof route & { config?: object }).config = {
		noHandle: false,
		hasSwing: false,
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(noSwingConfiguration),
			},
			async () => ({
				output: {
					...validSeed,
					lineItems: [
						{
							...validSeed.lineItems[0],
							housePackageTool: {
								doors: [
									{
										dimension: "3-0 x 6-8",
										swing: "inswing",
										lhQty: 1,
										rhQty: 0,
									},
								],
							},
						},
					],
				},
			}),
		),
	).rejects.toThrow("does not support it");
});

test("applies selected-component handling overrides before HPT validation", async () => {
	const overrideConfiguration = structuredClone(configuration);
	overrideConfiguration.visibilityByComponentUid.panel = {
		sectionOverride: {
			overrideMode: true,
			noHandle: true,
			hasSwing: false,
		},
	};
	const slabSeed = {
		...validSeed,
		lineItems: [
			{
				...validSeed.lineItems[0],
				housePackageTool: {
					doors: [{ dimension: "3-0 x 6-8", totalQty: 1 }],
				},
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(overrideConfiguration),
			},
			async () => ({ output: slabSeed }),
		),
	).resolves.toMatchObject({ seed: slabSeed });
});

test("groups split HPT lines with identical selections before returning the seed", async () => {
	const splitSeed = {
		...validSeed,
		lineItems: [
			{
				...validSeed.lineItems[0],
				uid: "line-a",
				housePackageTool: {
					doors: [{ dimension: "3-0 x 6-8", swing: "", lhQty: 1, rhQty: 0 }],
				},
			},
			{
				...validSeed.lineItems[0],
				uid: "line-b",
				housePackageTool: {
					doors: [{ dimension: "2-10 x 6-8", swing: "", lhQty: 0, rhQty: 1 }],
				},
			},
		],
	};

	const result = await generateNewSalesFormSeed(input, async () => ({
		output: splitSeed,
	}));

	expect(result.seed.lineItems).toHaveLength(1);
	expect(result.seed.lineItems[0]).toMatchObject({
		uid: "line-a",
		qty: 2,
		housePackageTool: {
			doors: [
				{ dimension: "3-0 x 6-8", lhQty: 1, rhQty: 0 },
				{ dimension: "2-10 x 6-8", lhQty: 0, rhQty: 1 },
			],
		},
	});
});

test("rejects multiple Door components on a line that contains HPT rows", async () => {
	const seed = structuredClone(validSeed);
	const doorStep = seed.lineItems[0]?.formSteps.find(
		(step) => step.stepId === 3,
	);
	if (!doorStep || !("meta" in doorStep))
		throw new Error("Expected Door fixture selection");
	doorStep.meta.selectedProdUids = ["panel", "lite"];

	await expect(
		generateNewSalesFormSeed(input, async () => ({ output: seed })),
	).rejects.toThrow("select one Door component");
});

test("keeps source-grounded HPT rows when the one missing Door is explicitly unresolved", async () => {
	const seed = structuredClone(validSeed);
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.formSteps = line.formSteps.filter((step) => step.stepId !== 3);
	seed.unresolved = [
		{
			lineUid: line.uid,
			stepId: 3,
			field: "door",
			status: "unsupported",
			reason: "No configured Door exactly matches the request",
		},
	];

	await expect(
		generateNewSalesFormSeed(input, async () => ({ output: seed })),
	).resolves.toMatchObject({ seed });
});

test("keeps a sized room line and asks for its missing Door product", () => {
	const line = {
		...structuredClone(validSeed.lineItems[0]), uid: "garage-door-entry",
		formSteps: validSeed.lineItems[0].formSteps.filter((step) => step.stepId !== 3),
	};
	const result = validateNewSalesFormSeedConfiguration({
		schemaVersion: 2, lineItems: [line],
		unresolved: [
			{ lineUid: line.uid, stepId: null, field: "swing",
				status: "ambiguous", reason: "Confirm swing for Garage Door Entry" },
			{ lineUid: line.uid, stepId: null, field: "height",
				status: "unsupported", reason: "Confirm configured height" },
		],
	}, JSON.stringify(configuration), "Garage Door Entry - 36\" x 80\"; swing not confirmed");
	expect(result.lineItems[0]?.housePackageTool?.doors).toEqual(line.housePackageTool?.doors);
	expect(result.unresolved).toContainEqual({
		lineUid: line.uid, stepId: 3, field: "door", status: "ambiguous",
		reason: "Confirm the Door product for Garage Door Entry; its stated size and count remain for review.",
	});
});

test("applies one visible domain-compatible unresolved Door and preserves true ambiguity", async () => {
	const doorConfiguration = structuredClone(configuration);
	const doorStep = doorConfiguration.steps.find((step) => step.id === 3)!;
	doorStep.components = [
		["D9xpD", "s.c harboard flush primed door 1-3/8"],
		["molded", "1-3/8 S.C. Molded Primed"],
		["OdAMw", "1-3/8 S.C. Hardboard Flush Primed Fire Rated"],
	];
	doorConfiguration.visibilityByComponentUid.D9xpD =
		doorConfiguration.visibilityByComponentUid.lite;
	doorConfiguration.visibilityByComponentUid.molded =
		doorConfiguration.visibilityByComponentUid.lite;
	doorConfiguration.visibilityByComponentUid.OdAMw =
		doorConfiguration.visibilityByComponentUid.lite;
	const unresolvedSeed = {
		...validSeed,
		lineItems: [
			{
				...validSeed.lineItems[0],
				formSteps: validSeed.lineItems[0].formSteps.filter(
					(step) => step.stepId !== 3,
				),
			},
		],
		unresolved: [
			{
				lineUid: "line-1",
				stepId: 3,
				field: "door",
				status: "unsupported",
				reason: "No exact Door product title matches the request.",
			},
		],
	};
	const text =
		"One 36 x 1-3/8 x 80 smooth white-primed engineered solid-core flush interior door slab, flush as opposed to molded";

	const corrected = await generateNewSalesFormSeed(
		{
			...input,
			text,
			configurationJson: JSON.stringify(doorConfiguration),
		},
		async () => ({ output: unresolvedSeed }),
	);
	expect(corrected.seed.lineItems[0]?.formSteps).toContainEqual({
		stepId: 3,
		meta: { selectedProdUids: ["D9xpD"] },
	});
	expect(corrected.seed.unresolved).toEqual([]);
	expect(corrected.seed.interpretations).toEqual([
		{
			lineUid: "line-1",
			stepId: 3,
			field: "door",
			sourceText: text,
			selectedProdUid: "D9xpD",
			selectedTitle: "s.c harboard flush primed door 1-3/8",
			reason:
				"Mapped the customer Door description to the only compatible visible configured component.",
		},
	]);

	const ambiguousConfiguration = structuredClone(doorConfiguration);
	ambiguousConfiguration.steps
		.find((step) => step.id === 3)!
		.components.push(["second-flush", "1-3/8 SC Engineered Flush Primed"]);
	ambiguousConfiguration.visibilityByComponentUid["second-flush"] =
		doorConfiguration.visibilityByComponentUid.lite;
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text,
				configurationJson: JSON.stringify(ambiguousConfiguration),
			},
			async () => ({ output: unresolvedSeed }),
		),
	).resolves.toMatchObject({ seed: unresolvedSeed });
});

test("corrects one source-compatible Door prerequisite using real catalog visibility shape", async () => {
	const realCatalogConfiguration = {
		componentColumns: ["uid", "title"],
		routes: [
			{
				itemTypeUid: "2oWEo",
				rootStepId: 1,
				stepUids: ["wUGhI", "door"],
			},
		],
		schemaVersion: 1,
		steps: [
			{
				id: 1,
				uid: "type",
				title: "Item Type",
				selectionMode: "single",
				components: [["2oWEo", "Door Slabs Only"]],
			},
			{
				id: 41,
				uid: "wUGhI",
				title: "Door Type",
				selectionMode: "single",
				components: [
					["fUJc7", "SC Molded"],
					["owVLr", "SC Flush"],
				],
			},
			{
				id: 3,
				uid: "door",
				title: "Door",
				selectionMode: "multiple",
				components: [
					["D9xpD", "s.c harboard flush primed door 1-3/8"],
					["tlWbz", "S.C FLUSH hardboard DOOR PRIMED 1-3/8"],
					["OdAMw", "s.c harboard flush primed fire rated door 1-3/8"],
				],
			},
		],
		visibilityByComponentUid: {
			"2oWEo": { variations: [] },
			fUJc7: { variations: [] },
			owVLr: { variations: [] },
			D9xpD: {
				variations: [
					{
						rules: [
							{
								stepUid: "wUGhI",
								operator: "is",
								componentsUid: ["owVLr"],
							},
						],
					},
				],
			},
			tlWbz: {
				variations: [
					{
						rules: [
							{
								stepUid: "wUGhI",
								operator: "is",
								componentsUid: ["fUJc7"],
							},
						],
					},
				],
			},
			OdAMw: {
				variations: [
					{
						rules: [
							{
								stepUid: "wUGhI",
								operator: "is",
								componentsUid: ["owVLr"],
							},
						],
					},
				],
			},
		},
	};
	const text =
		"One 36 x 1-3/8 x 80 smooth, white-primed, engineered solid-core interior door slab.";
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "slab-line",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "2oWEo" },
					{ stepId: 41, prodUid: "fUJc7" },
				],
				housePackageTool: {
					doors: [{ dimension: "3-0 x 6-8", lhQty: 1, rhQty: 0 }],
				},
			},
		],
		unresolved: [
			{
				lineUid: "slab-line",
				stepId: 3,
				field: "door",
				status: "unsupported",
				reason: "No listed Door matches the description.",
			},
		],
	};
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text,
			configurationJson: JSON.stringify(realCatalogConfiguration),
		},
		async () => ({ output: seed }),
	);

	expect(result.seed.lineItems[0]?.formSteps).toEqual([
		{ stepId: 1, prodUid: "2oWEo" },
		{ stepId: 41, prodUid: "owVLr" },
		{ stepId: 3, meta: { selectedProdUids: ["D9xpD"] } },
	]);
	expect(result.seed.lineItems[0]?.formSteps).not.toContainEqual({
		stepId: 3,
		meta: { selectedProdUids: ["tlWbz"] },
	});
	expect(result.seed.unresolved).toEqual([]);
	expect(result.seed.interpretations).toMatchObject([
		{
			stepId: 41,
			selectedProdUid: "owVLr",
			selectedTitle: "SC Flush",
			sourceText: text,
		},
		{
			stepId: 3,
			selectedProdUid: "D9xpD",
			selectedTitle: "s.c harboard flush primed door 1-3/8",
			sourceText: text,
		},
	]);
});

test("resolves the exact compact slab configuration without a Door unresolved marker", async () => {
	const exactConfiguration = {
		componentColumns: ["uid", "title"],
		routes: [
			{
				itemTypeUid: "2oWEo",
				rootStepId: 1,
				stepUids: ["height", "wUGhI", "door"],
				config: { noHandle: true, hasSwing: false },
			},
		],
		schemaVersion: 1,
		steps: [
			{
				id: 1,
				uid: "MtJgR",
				title: "Item Type",
				selectionMode: "single",
				components: [
					["2oWEo", "Door Slabs Only"],
					["KmUMM", "Interior Door"],
				],
			},
			{
				id: 13,
				uid: "height",
				title: "Height",
				selectionMode: "single",
				components: [["D2Vup", "6-8"]],
			},
			{
				id: 41,
				uid: "wUGhI",
				title: "Door Type",
				selectionMode: "single",
				components: [
					["fUJc7", "SC Molded"],
					["owVLr", "SC Flush"],
				],
			},
			{
				id: 51,
				uid: "door",
				title: "Door",
				selectionMode: "multiple",
				components: [
					["D9xpD", "s.c harboard flush primed door 1-3/8"],
					["tlWbz", "S.C FLUSH hardboard DOOR PRIMED 1-3/8"],
				],
			},
		],
		visibilityByComponentUid: {
			D9xpD: {
				variations: [
					{
						rules: [
							{
								stepUid: "MtJgR",
								operator: "is",
								componentsUid: ["2oWEo", "KmUMM"],
							},
							{
								stepUid: "wUGhI",
								operator: "is",
								componentsUid: ["owVLr"],
							},
						],
					},
				],
			},
			tlWbz: {
				variations: [
					{
						rules: [
							{
								stepUid: "MtJgR",
								operator: "is",
								componentsUid: ["KmUMM", "2oWEo"],
							},
							{
								stepUid: "wUGhI",
								operator: "is",
								componentsUid: ["fUJc7"],
							},
						],
					},
				],
			},
		},
	};
	const text =
		"14 smooth, white-primed, engineered solid-core interior door slabs, 1-3/8 thick: 1 at 28 x 80, 11 at 34 x 80, and 2 at 36 x 80.";
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "slabs",
				qty: 14,
				formSteps: [
					{ stepId: 1, prodUid: "2oWEo" },
					{ stepId: 13, prodUid: "D2Vup" },
					{ stepId: 41, prodUid: "fUJc7" },
				],
				housePackageTool: {
					doors: [
						{ dimension: "2-4 x 6-8", totalQty: 1 },
						{ dimension: "2-10 x 6-8", totalQty: 11 },
						{ dimension: "3-0 x 6-8", totalQty: 2 },
					],
				},
			},
		],
		unresolved: [],
		interpretations: [
			{
				lineUid: "slabs",
				stepId: 41,
				field: "door type",
				sourceText: "solid-core interior door slabs",
				selectedProdUid: "fUJc7",
				selectedTitle: "SC Molded",
				reason: "Interpreted solid-core as SC Molded.",
			},
		],
	};
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text,
			configurationJson: JSON.stringify(exactConfiguration),
		},
		async () => ({ output: seed }),
	);

	expect(result.seed.lineItems[0]?.formSteps).toEqual([
		{ stepId: 1, prodUid: "2oWEo" },
		{ stepId: 13, prodUid: "D2Vup" },
		{ stepId: 41, prodUid: "owVLr" },
		{ stepId: 51, meta: { selectedProdUids: ["D9xpD"] } },
	]);
	expect(result.seed.unresolved).toEqual([]);
	expect(result.seed.interpretations).toHaveLength(2);
	expect(
		result.seed.interpretations?.map((item) => item.selectedProdUid),
	).toEqual(["owVLr", "D9xpD"]);
});

test("rejects HPT rows when an unresolved Door belongs to another route", async () => {
	const crossRouteConfiguration = structuredClone(configuration);
	crossRouteConfiguration.routes.push({
		itemTypeUid: "other",
		rootStepId: 1,
		stepUids: ["other-door"],
	});
	crossRouteConfiguration.steps[0]?.components.push(["other", "Other"]);
	crossRouteConfiguration.steps.push({
		id: 4,
		uid: "other-door",
		title: "Door",
		selectionMode: "single",
		components: [["other-panel", "Other Panel"]],
	});
	const seed = structuredClone(validSeed);
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.formSteps = line.formSteps.filter((step) => step.stepId !== 3);
	seed.unresolved = [
		{
			lineUid: line.uid,
			stepId: 4,
			field: "door",
			status: "unsupported",
			reason: "No configured Door exactly matches the request",
		},
	];

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(crossRouteConfiguration),
			},
			async () => ({ output: seed }),
		),
	).rejects.toThrow("select one Door component");
});

test("rejects HPT rows when the unresolved field is not Door", async () => {
	const seed = structuredClone(validSeed);
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.formSteps = line.formSteps.filter((step) => step.stepId !== 3);
	seed.unresolved = [
		{
			lineUid: line.uid,
			stepId: 3,
			field: "width",
			status: "unsupported",
			reason: "Width is missing",
		},
	];

	await expect(
		generateNewSalesFormSeed(input, async () => ({ output: seed })),
	).rejects.toThrow("select one Door component");
});

test("provider cannot inject persisted price fields", async () => {
	await expect(
		generateNewSalesFormSeed(input, async () => ({
			output: { ...validSeed, total: 999 },
		})),
	).rejects.toThrow("seed format");
});

test("accepts a source-grounded custom value only on a custom-capable step", async () => {
	const customConfiguration = structuredClone(configuration);
	customConfiguration.steps[1] = {
		...customConfiguration.steps[1],
		custom: true,
	};
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-custom",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 2, value: "6-9/16 INCH" },
				],
			},
		],
		unresolved: [],
	} as const;
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "Customer requests a 6-9/16 inch jamb",
				configurationJson: JSON.stringify(customConfiguration),
			},
			async () => ({ output: seed }),
		),
	).resolves.toMatchObject({
		seed: { ...seed, unresolved: [{ field: "handing", status: "ambiguous" }] },
	});
});

test("uses decoded grounding text without exposing it to the provider", async () => {
	const customConfiguration = structuredClone(configuration);
	customConfiguration.steps[1] = {
		...customConfiguration.steps[1],
		custom: true,
	};
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-custom-envelope",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 2, value: "6-9/16 INCH" },
				],
			},
		],
		unresolved: [],
	} as const;
	let providerInput: Record<string, unknown> | undefined;

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "canonical safety envelope",
				groundingText: "Customer requests a 6-9/16 inch jamb",
				configurationJson: JSON.stringify(customConfiguration),
			},
			async (received) => {
				providerInput = received as unknown as Record<string, unknown>;
				return { output: seed };
			},
		),
	).resolves.toMatchObject({
		seed: { ...seed, unresolved: [{ field: "handing", status: "ambiguous" }] },
	});
	expect(providerInput).toMatchObject({ text: "canonical safety envelope" });
	expect(providerInput).not.toHaveProperty("groundingText");
});

test("rejects a custom value that was not stated by the customer", async () => {
	const customConfiguration = structuredClone(configuration);
	customConfiguration.steps[1] = {
		...customConfiguration.steps[1],
		custom: true,
	};
	await expect(
		generateNewSalesFormSeed(
			{ ...input, configurationJson: JSON.stringify(customConfiguration) },
			async () => ({
				output: {
					schemaVersion: 2,
					lineItems: [
						{
							uid: "line-custom",
							qty: 1,
							formSteps: [
								{ stepId: 1, prodUid: "exterior" },
								{ stepId: 2, value: "6-9/16 INCH" },
							],
						},
					],
					unresolved: [],
				},
			}),
		),
	).rejects.toThrow("must be stated");
});

test("validates Services and native delivery fields against the request", async () => {
	const serviceConfiguration = structuredClone(configuration);
	serviceConfiguration.routes.push({
		itemTypeUid: "services",
		rootStepId: 1,
		stepUids: [],
	});
	serviceConfiguration.steps[0]?.components.push(["services", "Services"]);
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "service-line",
				qty: 1,
				formSteps: [{ stepId: 1, prodUid: "services" }],
				meta: {
					serviceRows: [{ uid: "svc-1", service: "Door copy fee", qty: 1 }],
				},
			},
		],
		form: { deliveryOption: "delivery" },
		extraCosts: [{ id: null, label: "Delivery", type: "Delivery", amount: 45 }],
		unresolved: [],
	} as const;
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "Door copy fee. Please deliver; delivery is $45.",
				configurationJson: JSON.stringify(serviceConfiguration),
			},
			async () => ({ output: seed }),
		),
	).resolves.toMatchObject({ seed });

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "Please deliver; delivery is $45.",
				configurationJson: JSON.stringify(serviceConfiguration),
			},
			async () => ({ output: seed }),
		),
	).rejects.toThrow("Service Door copy fee must be stated");
});

test("rejects custom output on ordinary steps and exact standard-title duplicates", async () => {
	const baseSeed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-custom",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "exterior" },
					{ stepId: 2, value: "6-9/16 INCH" },
				],
			},
		],
		unresolved: [],
	} as const;
	await expect(
		generateNewSalesFormSeed(input, async () => ({ output: baseSeed })),
	).rejects.toThrow("does not allow custom values");

	const customConfiguration = structuredClone(configuration);
	customConfiguration.steps[1] = {
		...customConfiguration.steps[1],
		custom: true,
	};
	await expect(
		generateNewSalesFormSeed(
			{ ...input, configurationJson: JSON.stringify(customConfiguration) },
			async () => ({
				output: {
					...baseSeed,
					lineItems: [
						{
							...baseSeed.lineItems[0],
							formSteps: [
								{ stepId: 1, prodUid: "exterior" },
								{ stepId: 2, value: " pvc " },
							],
						},
					],
				},
			}),
		),
	).rejects.toThrow("matches standard component pvc");
});

test.each([
	{
		name: "unknown step",
		formSteps: [
			{ stepId: 1, prodUid: "exterior" },
			{ stepId: 99, prodUid: "pvc" },
		],
	},
	{
		name: "wrong selection cardinality",
		formSteps: [
			{ stepId: 1, prodUid: "exterior" },
			{ stepId: 2, meta: { selectedProdUids: ["pvc"] } },
		],
	},
	{
		name: "unknown component",
		formSteps: [
			{ stepId: 1, prodUid: "exterior" },
			{ stepId: 2, prodUid: "invented" },
		],
	},
	{
		name: "unknown route",
		formSteps: [{ stepId: 1, prodUid: "invented" }],
	},
])("rejects $name", async ({ formSteps }) => {
	await expect(
		generateNewSalesFormSeed(input, async () => ({
			output: {
				...validSeed,
				lineItems: [{ ...validSeed.lineItems[0], formSteps }],
			},
		})),
	).rejects.toThrow();
});

test("rejects a component hidden by configured dependency rules", async () => {
	await expect(
		generateNewSalesFormSeed(input, async () => ({
			output: {
				...validSeed,
				lineItems: [
					{
						...validSeed.lineItems[0],
						formSteps: [
							{ stepId: 1, prodUid: "exterior" },
							{
								stepId: 3,
								meta: { selectedProdUids: ["lite"] },
							},
						],
					},
				],
			},
		})),
	).rejects.toThrow("hidden by configured rules");
});

test("rejects a component whose visibility depends on a later route step", async () => {
	const forwardDependencyConfiguration = structuredClone(configuration);
	forwardDependencyConfiguration.visibilityByComponentUid.pvc = {
		variations: [
			{
				rules: [
					{
						stepUid: "door",
						operator: "is",
						componentsUid: ["panel"],
					},
				],
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(forwardDependencyConfiguration),
			},
			async () => ({ output: validSeed }),
		),
	).rejects.toThrow("hidden by configured rules");
});

test("rechecks earlier isNot visibility after later selections are known", async () => {
	const completedCombinationConfiguration = structuredClone(configuration);
	completedCombinationConfiguration.visibilityByComponentUid.pvc = {
		variations: [
			{
				rules: [
					{
						stepUid: "door",
						operator: "isNot",
						componentsUid: ["panel"],
					},
				],
			},
		],
	};

	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				configurationJson: JSON.stringify(completedCombinationConfiguration),
			},
			async () => ({ output: validSeed }),
		),
	).rejects.toThrow("completed configured rules");
});

test("cancelled generation never calls the provider", async () => {
	const controller = new AbortController();
	controller.abort();
	let called = false;
	await expect(
		generateNewSalesFormSeed(
			{ ...input, signal: controller.signal },
			async () => {
				called = true;
				return { output: {} };
			},
		),
	).rejects.toThrow();
	expect(called).toBe(false);
});

test("provider receives a bounded abort signal", async () => {
	let bounded = false;
	await expect(
		generateNewSalesFormSeed(input, async (request) => {
			bounded = request.signal !== input.signal;
			throw new Error("test provider exit");
		}),
	).rejects.toThrow("AI provider could not generate");
	expect(bounded).toBe(true);
});

test("invalid image content is rejected before any provider call", async () => {
	let called = false;
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				images: [
					{ bytes: Buffer.from("invalid image"), mediaType: "image/png" },
				],
			},
			async () => {
				called = true;
				return { output: {} };
			},
		),
	).rejects.toThrow();
	expect(called).toBe(false);
});

test("provider failure does not expose customer content through its error", async () => {
	try {
		await generateNewSalesFormSeed(input, async () => {
			throw new Error("private customer request in provider error");
		});
		throw new Error("Expected provider failure");
	} catch (error) {
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe(
			"The AI provider could not generate a request preview. Try again.",
		);
		expect((error as Error).cause).toBeUndefined();
	}
});

test("provider failure telemetry receives only a safe diagnostic", async () => {
	let diagnostic: unknown;
	await expect(
		generateNewSalesFormSeed(
			input,
			async () => {
				throw new Error("private customer request in provider error");
			},
			{
				onProviderFailure: (value) => {
					diagnostic = value;
				},
			},
		),
	).rejects.toThrow("AI provider could not generate");
	expect(diagnostic).toEqual({ stage: "unknown" });
	expect(JSON.stringify(diagnostic)).not.toMatch(/private|customer|request/i);
});

test("requires an explicitly counted exact catalog kit instead of accepting a partial conversion", async () => {
	const config = structuredClone(mouldingConfiguration);
	config.steps[1]!.components.push(["attic-kit", "ATTIC ACCESS KIT /"]);
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "400 linear feet BASEBOARD WM713 3-1/4 X 9/16 X 16 including 10% waste.\nOne (1) piece of ATTIC ACCESS KIT.",
				configurationJson: JSON.stringify(config),
			},
			async () => ({ output: mouldingLinearFeetSeed }),
		),
	).rejects.toThrow("Requested Moulding ATTIC ACCESS KIT / is missing");
});

test("accepts an explicitly counted catalog kit without a product length", async () => {
	const config = structuredClone(mouldingConfiguration);
	config.steps[1]!.components.push(["attic-kit", "ATTIC ACCESS KIT /"]);
	const seed = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{ stepId: 215, meta: { selectedProdUids: ["attic-kit"] } },
				],
				meta: { mouldingRows: [{ uid: "attic-kit", qty: 1 }] },
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "One (1) piece of ATTIC ACCESS KIT.",
				configurationJson: JSON.stringify(config),
			},
			async () => ({ output: seed }),
		),
	).resolves.toMatchObject({ seed });
});

test("retains an identified moulding with explicit pending quantity without inventing a charge", async () => {
	const seed = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 0,
				meta: { mouldingRows: [{ uid: "baseboard-16", qty: 0 }] },
			},
		],
		unresolved: [
			{
				lineUid: "moulding-line",
				stepId: null,
				field: "quantity",
				status: "ambiguous",
				reason: "Confirm piece count",
			},
		],
	};
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16, quantity to be confirmed",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({ output: seed }),
		),
	).resolves.toMatchObject({ seed });
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "BASEBOARD WM713 3-1/4 x 9/16 x 16, quantity to be confirmed",
				configurationJson: JSON.stringify(mouldingConfiguration),
			},
			async () => ({
				output: {
					...seed,
					lineItems: [
						{
							...seed.lineItems[0],
							qty: 7,
							meta: { mouldingRows: [{ uid: "baseboard-16", qty: 7 }] },
						},
					],
				},
			}),
		),
	).rejects.toThrow("Moulding quantity 7 must be stated");
});

test("confirmed product quantity resolves a repeated question without guessing other rows", async () => {
	const title = "BASEBOARD WM713 3-1/4 X 9/16 X 16";
	const pending = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 0,
				meta: { mouldingRows: [{ uid: "baseboard-16", qty: 0 }] },
			},
		],
		unresolved: [
			{
				lineUid: "moulding-line",
				stepId: null,
				field: "quantity",
				status: "ambiguous",
				reason: "Confirm quantity",
			},
		],
	};
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text: title,
			groundingText: `${title} Quantity: 28`,
			configurationJson: JSON.stringify(mouldingConfiguration),
			clarifications: [
				{
					question: "Quantity?",
					field: "quantity",
					sourceText: title,
					answer: "28",
				},
			],
		},
		async () => ({ output: pending }),
	);
	expect(result.seed.lineItems[0]?.qty).toBe(28);
	expect(result.seed.unresolved).toEqual([]);
});

test("saved catalog alias reuses identity but requires current request quantities", async () => {
	const guidance = [
		{
			question: "Which profile?",
			field: "product",
			sourceText: "standard base",
			answer: "BASEBOARD WM713 3-1/4 X 9/16 X 16",
		},
	];
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text: "400 linear feet of standard base, including 10% waste",
			configurationJson: JSON.stringify(mouldingConfiguration),
			guidance,
		},
		async () => ({ output: mouldingLinearFeetSeed }),
	);
	expect(result.seed.lineItems[0]?.qty).toBe(28);
	await expect(
		generateNewSalesFormSeed(
			{
				...input,
				text: "standard base",
				configurationJson: JSON.stringify(mouldingConfiguration),
				guidance,
			},
			async () => ({ output: mouldingLinearFeetSeed }),
		),
	).rejects.toThrow();
});

test("current profile answer identifies generic baseboard without supplying quantity", async () => {
	const title = "BASEBOARD WM713 3-1/4 X 9/16 X 16";
	const text = "400 linear feet for baseboard with 10% waste";
	const clarifications = [{
		question: "Which baseboard profile?", field: "mouldingProfile",
		sourceText: "baseboard", answer: title,
	}];
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text,
			groundingText: salesRequestGroundingText(text, clarifications),
			configurationJson: JSON.stringify(mouldingConfiguration),
			clarifications,
		},
		async () => ({ output: mouldingLinearFeetSeed }),
	);
	expect(result.seed.lineItems[0]?.qty).toBe(28);
	await expect(generateNewSalesFormSeed(
		{
			...input, text: "baseboard",
			configurationJson: JSON.stringify(mouldingConfiguration),
			clarifications: [{ question: "Which profile?", field: "mouldingProfile", sourceText: "baseboard", answer: title }],
		},
		async () => ({ output: mouldingLinearFeetSeed }),
	)).rejects.toThrow();
});

test("DeepSeek applies confirmed quantity before cross-field validation", async () => {
	const { createSalesRequestProvider } = await import(
		"./sales-request-provider"
	);
	const title = "BASEBOARD WM713 3-1/4 X 9/16 X 16";
	const pending = {
		...mouldingLinearFeetSeed,
		lineItems: [
			{
				...mouldingLinearFeetSeed.lineItems[0],
				qty: 0,
				meta: { mouldingRows: [{ uid: "baseboard-16", qty: 28 }] },
			},
		],
		unresolved: [],
	};
	const provider = createSalesRequestProvider({
		selection: { provider: "deepseek", model: "deepseek-flash" },
		environment: { SALES_REQUEST_DEEPSEEK_API_KEY: "test" },
		generateTextImpl: (async () => ({
			output: pending,
			text: JSON.stringify(pending),
			usage: { inputTokens: 1, outputTokens: 1 },
		})) as any,
	});
	const result = await generateNewSalesFormSeed(
		{
			...input,
			text: title,
			groundingText: `${title} Quantity: 28`,
			configurationJson: JSON.stringify(mouldingConfiguration),
			clarifications: [
				{
					question: "Quantity?",
					field: "quantity",
					sourceText: title,
					answer: "28",
				},
			],
		},
		provider,
	);
	expect(result.seed.lineItems[0]?.qty).toBe(28);
});
