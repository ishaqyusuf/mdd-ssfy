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

test("conflicting fact ownership stays rejected", () => {
	const raw = response();
	raw.lineItems[0]!.unresolved = [{ ...fact, lineUid: "other" }];
	expect(
		newSalesFormSeedSchema.safeParse(normalizeSalesRequestProviderEnvelope(raw))
			.success,
	).toBe(false);
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
