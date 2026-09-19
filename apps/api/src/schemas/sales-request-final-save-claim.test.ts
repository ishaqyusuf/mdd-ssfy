import { describe, expect, test } from "bun:test";
import {
	salesRequestLowTouchFinalSaveClaimSchema,
	saveDraftNewSalesFormSchema,
	saveFinalNewSalesFormSchema,
	splitSalesRequestLowTouchFinalSaveClaim,
} from "./new-sales-form";

const claim = {
	source: "pasted-text" as const,
	generationId: "11111111-1111-4111-8111-111111111111",
	configurationScope: "sales-settings:7",
	configurationRevision: "configuration-revision-1",
	provider: "openai" as const,
	model: "gpt-5-mini",
	seed: {
		schemaVersion: 2 as const,
		lineItems: [
			{
				uid: "generated-line-1",
				qty: 1,
				formSteps: [{ stepId: 1, prodUid: "exterior" }],
			},
		],
		unresolved: [],
	},
};

const payload = {
	type: "order" as const,
	salesId: null,
	slug: null,
	version: "new-request-final-save",
	autosave: false,
	commitIntent: "final" as const,
	meta: { customerId: 10, customerProfileId: 2 },
	lineItems: [],
	extraCosts: [],
	summary: { taxRate: 0, subTotal: 0, taxTotal: 0, grandTotal: 0 },
};

describe("Sales Request low-touch final-save claim schema", () => {
	test("accepts a bounded pasted-text proof only on the final command", () => {
		const parsed = saveFinalNewSalesFormSchema.parse({
			...payload,
			lowTouchClaim: claim,
		});

		expect(parsed.lowTouchClaim).toEqual(claim);
		expect(
			"lowTouchClaim" in
				saveDraftNewSalesFormSchema.parse({ ...payload, lowTouchClaim: claim }),
		).toBe(false);

		const split = splitSalesRequestLowTouchFinalSaveClaim(parsed);
		expect(split.claim).toEqual(claim);
		expect(JSON.stringify(split.payload)).not.toContain("generationId");
	});

	test("rejects mailbox/image sources and provider-model mismatches", () => {
		for (const source of ["image", "mailbox"]) {
			expect(
				salesRequestLowTouchFinalSaveClaimSchema.safeParse({
					...claim,
					source,
				}).success,
			).toBe(false);
		}
		expect(
			salesRequestLowTouchFinalSaveClaimSchema.safeParse({
				...claim,
				provider: "deepseek",
				model: "gpt-5-mini",
			}).success,
		).toBe(false);
	});

	test("rejects unresolved or malformed native seeds", () => {
		expect(
			salesRequestLowTouchFinalSaveClaimSchema.safeParse({
				...claim,
				seed: { ...claim.seed, schemaVersion: 3 },
			}).success,
		).toBe(false);
	});
});

describe("cached picker final-save revision", () => {
	test("keeps an optional bounded revision out of persisted sales payloads", () => {
		const parsed = saveFinalNewSalesFormSchema.parse({
			...payload,
			expectedCatalogRevision: 4,
		});
		const split = splitSalesRequestLowTouchFinalSaveClaim(parsed);
		expect(split.expectedCatalogRevision).toBe(4);
		expect("expectedCatalogRevision" in split.payload).toBe(false);
		expect(
			saveFinalNewSalesFormSchema.safeParse({
				...payload,
				expectedCatalogRevision: -1,
			}).success,
		).toBe(false);
	});
});
