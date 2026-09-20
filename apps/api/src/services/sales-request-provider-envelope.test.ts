import { expect, test } from "bun:test";
import { newSalesFormSeedSchema } from "@gnd/sales/sales-form-core";
import { normalizeSalesRequestProviderEnvelope } from "./sales-request-provider-envelope";

const fact = {
	lineUid: "line-1",
	stepId: 13,
	field: "height",
	status: "unreadable",
	reason: "Height is unclear",
};

test("defaults an omitted unresolved collection without accepting malformed facts", () => {
	const line = {
		uid: "line-1",
		qty: 1,
		formSteps: [{ stepId: 1, prodUid: "route" }],
	};
	const missing = { schemaVersion: 2, lineItems: [line] };
	expect(
		newSalesFormSeedSchema.safeParse(
			normalizeSalesRequestProviderEnvelope(missing),
		).success,
	).toBe(true);
	expect(
		newSalesFormSeedSchema.safeParse(
			normalizeSalesRequestProviderEnvelope({ ...missing, unresolved: null }),
		).success,
	).toBe(true);
	expect(
		newSalesFormSeedSchema.safeParse(
			normalizeSalesRequestProviderEnvelope({ ...missing, unresolved: {} }),
		).success,
	).toBe(false);
});

function response() {
	return {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "line-1",
				qty: 2,
				formSteps: [{ stepId: 1, prodUid: "route" }],
				unresolved: [fact],
			},
		],
		unresolved: [],
	};
}

test("lifts misplaced facts without losing their scope or changing the raw response", () => {
	const raw = response();
	const before = structuredClone(raw);
	const normalized = normalizeSalesRequestProviderEnvelope(raw);
	expect(newSalesFormSeedSchema.safeParse(raw).success).toBe(false);
	const parsed = newSalesFormSeedSchema.parse(normalized);
	expect(parsed.unresolved).toEqual([fact]);
	expect(parsed.lineItems[0]?.qty).toBe(2);
	expect(raw).toEqual(before);
	expect(normalizeSalesRequestProviderEnvelope(normalized)).toEqual(normalized);
});

test("uses explicit HPT row counts for a zero placeholder line quantity", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{ uid: "door", qty: 0,
			formSteps: [{ stepId: 1, prodUid: "door-route" }],
			housePackageTool: { doors: [{ dimension: "2-8 x 8-0", totalQty: 1 }] },
		}],
		unresolved: [],
	};
	const normalized = normalizeSalesRequestProviderEnvelope(raw);
	expect(newSalesFormSeedSchema.parse(normalized).lineItems[0]?.qty).toBe(1);
	expect(raw.lineItems[0]?.qty).toBe(0);
	expect(normalizeSalesRequestProviderEnvelope(normalized)).toEqual(normalized);
	const mismatched = structuredClone(raw);
	mismatched.lineItems[0]!.qty = 3;
	expect(newSalesFormSeedSchema.safeParse(
		normalizeSalesRequestProviderEnvelope(mismatched),
	).success).toBe(false);
});

test("uses only complete selected direct Mouldings counts for a zero placeholder", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{ uid: "mouldings", qty: 0,
			formSteps: [{ stepId: 1, prodUid: "mouldings" },
				{ stepId: 215, meta: { selectedProdUids: ["base", "casing", "crown"] } }],
			meta: { mouldingRows: [
				{ uid: "base", qty: 24 }, { uid: "casing", qty: 36 }, { uid: "crown", qty: 21 },
			] },
		}],
		unresolved: [],
	};
	const before = structuredClone(raw);
	const normalized = normalizeSalesRequestProviderEnvelope(raw);
	expect(newSalesFormSeedSchema.parse(normalized).lineItems[0]?.qty).toBe(81);
	expect(raw).toEqual(before);
	expect(normalizeSalesRequestProviderEnvelope(normalized)).toEqual(normalized);

	for (const rows of [
		[{ uid: "base", qty: 0 }, { uid: "casing", qty: 36 }, { uid: "crown", qty: 21 }],
		[{ uid: "base", qty: 24 }, { uid: "casing", calculation: {
			linearFeet: 36, pieceLength: 8,
		} }, { uid: "crown", qty: 21 }],
		[{ uid: "base", qty: 24, calculation: {
			linearFeet: 36, pieceLength: 8,
		} }, { uid: "casing", qty: 36 }, { uid: "crown", qty: 21 }],
		[],
	]) {
		const candidate = { ...raw, lineItems: [{ ...raw.lineItems[0]!,
			meta: { mouldingRows: rows } }] };
		expect((normalizeSalesRequestProviderEnvelope(candidate) as { lineItems: Array<{ qty: number }> })
			.lineItems[0]?.qty).toBe(0);
	}
	const mismatched = structuredClone(raw);
	mismatched.lineItems[0]!.formSteps[1]!.meta!.selectedProdUids = ["base", "casing", "other"];
	expect((normalizeSalesRequestProviderEnvelope(mismatched) as { lineItems: Array<{ qty: number }> })
		.lineItems[0]?.qty).toBe(0);
	const nonzero = structuredClone(raw);
	nonzero.lineItems[0]!.qty = 80;
	expect(newSalesFormSeedSchema.safeParse(
		normalizeSalesRequestProviderEnvelope(nonzero),
	).success).toBe(false);
});

test("conflicting fact ownership stays rejected", () => {
	const raw = response();
	raw.lineItems[0]!.unresolved = [{ ...fact, lineUid: "other" }];
	expect(
		newSalesFormSeedSchema.safeParse(normalizeSalesRequestProviderEnvelope(raw))
			.success,
	).toBe(false);
});

test("keeps a removed line's unresolved fact as global review without reassigning it", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{ uid: "supported", qty: 1, formSteps: [{ stepId: 1, prodUid: "route" }] }],
		unresolved: [{
			lineUid: "removed-8-8", stepId: 13, field: "doorSize",
			status: "unsupported", reason: "One 2-8 x 8-8 RH door is unavailable",
		}],
	};
	const normalized = normalizeSalesRequestProviderEnvelope(raw);
	const parsed = newSalesFormSeedSchema.parse(normalized);
	expect(parsed.lineItems).toHaveLength(1);
	expect(parsed.unresolved).toEqual([{
		lineUid: null, stepId: null, field: "doorSize",
		status: "unsupported", reason: "One 2-8 x 8-8 RH door is unavailable",
	}]);
	expect(raw.unresolved[0]?.lineUid).toBe("removed-8-8");
});

test("keeps a line-scoped question when the model omits its optional step ID", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{ uid: "exterior", qty: 2,
			formSteps: [{ stepId: 1, prodUid: "exterior-route" }] }],
		unresolved: [{ lineUid: "exterior", field: "quantity",
			status: "ambiguous", reason: "Confirm whether four leaves are two double units." }],
	};
	const normalized = normalizeSalesRequestProviderEnvelope(raw);
	expect(newSalesFormSeedSchema.parse(normalized).unresolved).toEqual([{
		...raw.unresolved[0], stepId: null,
	}]);
	expect(normalizeSalesRequestProviderEnvelope(normalized)).toEqual(normalized);
	expect(Object.hasOwn(raw.unresolved[0]!, "stepId")).toBe(false);
	const malformed = { ...raw, unresolved: [{ ...raw.unresolved[0], stepId: "51" }] };
	expect(newSalesFormSeedSchema.safeParse(
		normalizeSalesRequestProviderEnvelope(malformed),
	).success).toBe(false);
});

test("removes only a duplicate 80-inch height question when that line already selects 6-8", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{
			uid: "exterior", qty: 4,
			formSteps: [{ stepId: 1, prodUid: "exterior" }, { stepId: 13, prodUid: "height-68" }],
		}],
		unresolved: [
			{ lineUid: "exterior", stepId: 13, field: "height", status: "ambiguous",
				reason: "Confirm 80-inch height despite selected 6-8" },
			{ lineUid: "exterior", stepId: 2, field: "doorConfiguration", status: "ambiguous",
				reason: "Confirm the double-door configuration" },
		],
	};
	const context = {
		sourceText: "Four pre-hung doors, 36 x 1 3/4 x 80.",
		heightStepId: 13, eightyInchUid: "height-68",
	};
	const parsed = newSalesFormSeedSchema.parse(
		normalizeSalesRequestProviderEnvelope(raw, new Set(), context),
	);
	expect(parsed.unresolved.map((item) => item.field)).toEqual(["doorConfiguration"]);
	expect(newSalesFormSeedSchema.safeParse(normalizeSalesRequestProviderEnvelope(
		raw, new Set(), { ...context, sourceText: "36 x 80 and 2-8 x 8-0" },
	)).success).toBe(false);
	expect(raw.unresolved).toHaveLength(2);
});

test("keeps an unresolved optional fact and removes its conflicting selection and interpretation", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [{ uid: "exterior", qty: 2, formSteps: [
			{ stepId: 1, prodUid: "exterior-route" },
			{ stepId: 51, prodUid: "unconfirmed-door" },
		] }],
		unresolved: [{ lineUid: "exterior", stepId: 51, field: "door", status: "unsupported",
			reason: "Confirm a catalog-compatible fire-rated Door product" }],
		interpretations: [{ lineUid: "exterior", stepId: 51, field: "door",
			sourceText: "fire-rated door", selectedProdUid: "unconfirmed-door",
			selectedTitle: "Unconfirmed", reason: "Model guess" }],
	};
	const before = structuredClone(raw);
	const normalized = normalizeSalesRequestProviderEnvelope(raw, new Set(), undefined, new Set([1]));
	const parsed = newSalesFormSeedSchema.parse(normalized);
	expect(parsed.lineItems[0]?.formSteps).toEqual([{ stepId: 1, prodUid: "exterior-route" }]);
	expect(parsed.unresolved).toEqual(raw.unresolved);
	expect(parsed.interpretations).toEqual([]);
	expect(raw).toEqual(before);
	expect(normalizeSalesRequestProviderEnvelope(normalized, new Set(), undefined, new Set([1]))).toEqual(normalized);
	const rootConflict = { ...raw, unresolved: [{ ...raw.unresolved[0]!, stepId: 1 }] };
	expect(newSalesFormSeedSchema.safeParse(
		normalizeSalesRequestProviderEnvelope(rootConflict, new Set(), undefined, new Set([1])),
	).success).toBe(false);
});

test("keeps counted door-stop review when its sole Moulding choice conflicts", () => {
	const raw = {
		schemaVersion: 2,
		lineItems: [
			{ uid: "door", qty: 1, formSteps: [{ stepId: 1, prodUid: "door-route" }] },
			{ uid: "stop", qty: 6,
				formSteps: [{ stepId: 1, prodUid: "moulding-route" },
					{ stepId: 215, meta: { selectedProdUids: ["unconfirmed-stop"] } }],
				meta: { mouldingRows: [{ uid: "unconfirmed-stop", qty: 6 }] },
			},
		],
		unresolved: [{ lineUid: "stop", stepId: 215, field: "moulding",
			status: "ambiguous", reason: "Confirm the six door stop pieces and profile." }],
	};
	const before = structuredClone(raw);
	const normalized = normalizeSalesRequestProviderEnvelope(raw,
		new Set([215]), undefined, new Set([1]));
	const parsed = newSalesFormSeedSchema.parse(normalized);
	expect(parsed.lineItems.map((line) => line.uid)).toEqual(["door"]);
	expect(parsed.unresolved).toEqual([{ lineUid: null, stepId: null,
		field: "moulding", status: "ambiguous",
		reason: "Confirm the six door stop pieces and profile." }]);
	expect(raw).toEqual(before);
	expect(normalizeSalesRequestProviderEnvelope(normalized,
		new Set([215]), undefined, new Set([1]))).toEqual(normalized);
});

test("does not drop injected prices or fix invalid quantities", () => {
	const raw = {
		...response(),
		lineItems: [{ ...response().lineItems[0], qty: 0, price: 100 }],
	};
	expect(
		newSalesFormSeedSchema.safeParse(normalizeSalesRequestProviderEnvelope(raw))
			.success,
	).toBe(false);
});

test("normalizes scalar selection only for catalog-declared multiple steps", () => {
	const raw = response();
	raw.lineItems[0]!.formSteps.push({ stepId: 51, prodUid: "exact-door" });
	const before = structuredClone(raw);
	const parsed = newSalesFormSeedSchema.parse(
		normalizeSalesRequestProviderEnvelope(raw, new Set([51])),
	);
	expect(parsed.lineItems[0]?.formSteps).toEqual([
		{ stepId: 1, prodUid: "route" },
		{ stepId: 51, meta: { selectedProdUids: ["exact-door"] } },
	]);
	expect(parsed.lineItems[0]?.qty).toBe(2);
	expect(raw).toEqual(before);
});

test("keeps unknown selection fields invalid instead of dropping them during normalization", () => {
	const raw = response();
	const source = {
		...raw,
		lineItems: [
			{
				...raw.lineItems[0],
				formSteps: [{ stepId: 51, prodUid: "exact-door", price: 0 }],
			},
		],
	};
	expect(
		newSalesFormSeedSchema.safeParse(
			normalizeSalesRequestProviderEnvelope(source, new Set([51])),
		).success,
	).toBe(false);
});
