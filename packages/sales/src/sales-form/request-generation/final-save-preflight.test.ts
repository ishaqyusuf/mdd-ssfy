import { describe, expect, test } from "bun:test";
import {
	type SalesRequestFinalSaveCandidate,
	type SalesRequestFinalSavePreflightInput,
	buildSalesRequestCommercialFingerprint,
	evaluateSalesRequestFinalSavePreflight,
} from "./final-save-preflight";

function required<T>(value: T, label: string): NonNullable<T> {
	if (value == null) throw new Error(`Expected ${label}`);
	return value;
}

function fixtureLine(value: SalesRequestFinalSaveCandidate, index: number) {
	return required(value.lineItems[index], `line ${index}`);
}

function fixtureStep(
	value: SalesRequestFinalSaveCandidate,
	lineIndex: number,
	stepIndex: number,
) {
	return required(
		fixtureLine(value, lineIndex).formSteps?.[stepIndex],
		`line ${lineIndex} step ${stepIndex}`,
	);
}

function fixtureDoor(value: SalesRequestFinalSaveCandidate) {
	return required(
		fixtureLine(value, 0).housePackageTool?.doors?.[0],
		"HPT door",
	);
}

function fixtureMouldingRow(value: SalesRequestFinalSaveCandidate) {
	return required(
		fixtureLine(value, 1).meta?.mouldingRows?.[0],
		"Moulding row",
	);
}

function fixtureExtraCost(value: SalesRequestFinalSaveCandidate) {
	return required(value.extraCosts[0], "extra cost");
}

function candidate(): SalesRequestFinalSaveCandidate {
	return {
		type: "order",
		salesId: null,
		slug: null,
		form: {
			customerId: 101,
			customerProfileId: 7,
			deliveryOption: "pickup",
			paymentMethod: "Check",
			taxCode: "STANDARD",
			sellerOfRecord: "GND",
			resaleCertificateOnFile: false,
			notes: "presentation-only",
		},
		lineItems: [
			{
				id: 501,
				uid: "line-door",
				title: "Door presentation",
				description: "presentation-only",
				qty: 2,
				unitPrice: 120,
				lineTotal: 240,
				taxxable: true,
				formSteps: [
					{
						stepId: 1,
						step: { id: 1, uid: "item-type", title: "Item Type" },
						prodUid: "interior",
						value: "Interior Door",
						price: 0,
						basePrice: 0,
					},
					{
						stepId: 3,
						step: { id: 3, uid: "door", title: "Door" },
						componentId: 31,
						prodUid: "panel",
						value: "Panel Door",
						price: 120,
						basePrice: 60,
						meta: {
							selectedProdUids: ["panel"],
							selectedComponents: [
								{
									id: 31,
									uid: "panel",
									title: "Panel Door",
									img: "panel.png",
									basePrice: 60,
									salesPrice: 120,
								},
							],
						},
					},
				],
				shelfItems: [],
				housePackageTool: {
					id: 801,
					totalDoors: 2,
					totalPrice: 240,
					doors: [
						{
							id: 802,
							dimension: "3-0 x 6-8",
							swing: "inswing",
							lhQty: 1,
							rhQty: 1,
							totalQty: 2,
							doorPrice: 0,
							jambSizePrice: 120,
							casingPrice: 0,
							unitPrice: 120,
							lineTotal: 240,
							stepProductId: 31,
							meta: {
								componentUid: "panel",
								componentTitle: "Panel Door",
								baseUnitPrice: 60,
								doorSalesUnitPrice: 120,
								priceMissing: false,
							},
						},
					],
				},
			},
			{
				id: 502,
				uid: "line-moulding",
				title: "Mouldings",
				qty: 3,
				unitPrice: 20,
				lineTotal: 60,
				taxxable: false,
				formSteps: [
					{
						stepId: 1,
						step: { id: 1, uid: "item-type", title: "Item Type" },
						prodUid: "mouldings",
						value: "Mouldings",
					},
					{
						stepId: 215,
						step: { id: 215, uid: "moulding", title: "Moulding" },
						meta: { selectedProdUids: ["casing-17"] },
					},
				],
				meta: {
					mouldingRows: [
						{
							id: 601,
							salesItemId: 502,
							mouldingProductId: 41,
							stepProductId: 42,
							uid: "casing-17",
							title: "Casing presentation",
							img: "casing.png",
							qty: 3,
							basePrice: 10,
							salesPrice: 20,
							overridePrice: null,
							addon: 0,
							unitLabor: null,
							laborQty: null,
							lineTotal: 60,
						},
					],
				},
				shelfItems: [],
				housePackageTool: null,
			},
		],
		extraCosts: [
			{
				id: 701,
				label: "Labor presentation",
				type: "Labor",
				amount: 0,
				taxxable: false,
			},
		],
		summary: {
			subTotal: 300,
			adjustedSubTotal: 300,
			taxRate: 0.07,
			taxTotal: 16.8,
			grandTotal: 316.8,
			totalWithCcc: 316.8,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			taxableSubTotal: 240,
			ccc: 0,
		},
	};
}

function input(): SalesRequestFinalSavePreflightInput {
	const finalSaveCandidate = candidate();
	return {
		authoritative: {
			configurationScope: "sales-settings:7",
			configurationRevision: "config-2",
			provider: "openai",
			model: "gpt-5-mini",
			providerBenchmark: {
				provider: "openai",
				model: "gpt-5-mini",
				passed: true,
			},
			customerId: 101,
			customerProfileId: 7,
			customerProfileRevision: "profile-4",
			stock: "known",
			tax: "known",
			permission: { allowed: true, revision: "permission-3" },
		},
		run: {
			generated: {
				source: "pasted-text",
				configurationScope: "sales-settings:7",
				configurationRevision: "config-2",
				provider: "openai",
				model: "gpt-5-mini",
				seedDigest: "seed-1",
				unsupportedFactCount: 0,
				customValueCount: 0,
				unpricedItemCount: 0,
			},
			applied: {
				commercialFingerprint:
					buildSalesRequestCommercialFingerprint(finalSaveCandidate),
				seedDigest: "seed-1",
				customerId: 101,
				customerProfileId: 7,
				customerProfileRevision: "profile-4",
				permissionRevision: "permission-3",
			},
		},
		candidate: finalSaveCandidate,
	};
}

describe("Sales Request Generation final-save preflight", () => {
	test("allows a bound current candidate and returns its canonical fingerprint", () => {
		const preflightInput = input();
		const before = structuredClone(preflightInput);
		const result = evaluateSalesRequestFinalSavePreflight(preflightInput);

		expect(result).toEqual({
			ok: true,
			blockers: [],
			commercialFingerprint: preflightInput.run.applied.commercialFingerprint,
		});
		expect(preflightInput).toEqual(before);
	});

	test("returns every blocker once in deterministic policy order", () => {
		const preflightInput = input();
		preflightInput.run.generated.unsupportedFactCount = 2;
		preflightInput.run.generated.customValueCount = 1;
		preflightInput.run.generated.unpricedItemCount = 1;
		const firstLine = preflightInput.candidate.lineItems[0];
		if (!firstLine) throw new Error("Expected a line fixture");
		firstLine.shelfItems = [{ id: 1, qty: 1 }];
		firstLine.meta = {
			...(firstLine.meta || {}),
			serviceRows: [{ uid: "installation", qty: 1, salesPrice: 10 }],
		};
		const firstStep = firstLine.formSteps?.[0];
		if (!firstStep) throw new Error("Expected a step fixture");
		firstStep.meta = {
			...(firstStep.meta || {}),
			selectedComponents: [
				{
					uid: "custom-preview:1",
					custom: true,
					_metaData: { custom: true, priceMissing: true },
				},
			],
		};
		preflightInput.candidate.form = {
			...preflightInput.candidate.form,
			deliveryOption: "delivery",
		};
		preflightInput.candidate.summary = {
			...preflightInput.candidate.summary,
			discount: 5,
		};
		preflightInput.authoritative.stock = "unknown";
		preflightInput.authoritative.tax = "unknown";
		preflightInput.authoritative.providerBenchmark = null;
		preflightInput.authoritative.configurationRevision = "config-3";
		preflightInput.authoritative.provider = "google";
		preflightInput.authoritative.model = "gemini-3.8-flash";
		preflightInput.authoritative.customerProfileRevision = "profile-5";
		preflightInput.authoritative.permission = {
			allowed: false,
			revision: "permission-4",
		};
		preflightInput.run.applied.commercialFingerprint =
			buildSalesRequestCommercialFingerprint(preflightInput.candidate);

		expect(
			evaluateSalesRequestFinalSavePreflight(preflightInput).blockers.map(
				(blocker) => blocker.code,
			),
		).toEqual([
			"unsupported-facts",
			"custom-values",
			"unpriced-items",
			"shelf-items-not-supported",
			"services-not-supported",
			"delivery-not-supported",
			"nonzero-discount",
			"stock-unknown",
			"tax-unknown",
			"provider-benchmark-missing",
			"configuration-stale",
			"provider-model-stale",
			"customer-profile-stale",
			"permission-denied-or-stale",
		]);
	});

	test("rejects a candidate whose commercial state changed after apply", () => {
		const preflightInput = input();
		const line = preflightInput.candidate.lineItems[0];
		if (!line) throw new Error("Expected a line fixture");
		line.qty = 3;

		expect(
			evaluateSalesRequestFinalSavePreflight(preflightInput).blockers,
		).toEqual([
			{
				code: "commercial-fingerprint-mismatch",
				expected: preflightInput.run.applied.commercialFingerprint,
				actual: buildSalesRequestCommercialFingerprint(
					preflightInput.candidate,
				),
			},
		]);
	});

	test("fails closed when configuration scope or the applied seed binding changes", () => {
		const preflightInput = input();
		preflightInput.authoritative.configurationScope = "sales-settings:8";
		preflightInput.run.applied.seedDigest = "different-seed";

		expect(
			evaluateSalesRequestFinalSavePreflight(preflightInput).blockers,
		).toEqual([
			{
				code: "configuration-stale",
				generatedScope: "sales-settings:7",
				currentScope: "sales-settings:8",
				generatedRevision: "config-2",
				currentRevision: "config-2",
			},
			{
				code: "seed-binding-mismatch",
				generatedSeedDigest: "seed-1",
				appliedSeedDigest: "different-seed",
			},
		]);
	});

	test("fails closed for an existing or non-order/quote candidate", () => {
		const preflightInput = input();
		preflightInput.candidate.type = "invoice";
		preflightInput.candidate.salesId = 9001;
		preflightInput.candidate.slug = "existing-order";
		preflightInput.run.applied.commercialFingerprint =
			buildSalesRequestCommercialFingerprint(preflightInput.candidate);

		expect(
			evaluateSalesRequestFinalSavePreflight(preflightInput).blockers,
		).toEqual([{ code: "surface-not-supported" }, { code: "existing-record" }]);
	});
});

describe("Sales Request Generation commercial fingerprint", () => {
	test("ignores durable database IDs, display data, and collection presentation order", () => {
		const original = candidate();
		const changed = structuredClone(original);
		changed.salesId = 123456;
		changed.slug = "different-slug";
		changed.form.notes = "Different notes";
		changed.lineItems.reverse();
		for (const line of changed.lineItems) {
			line.id = Number(line.id || 0) + 1000;
			line.title = "Different title";
			line.description = "Different description";
			line.formSteps?.reverse();
			for (const step of line.formSteps || []) {
				if (step.step) {
					step.step.id = Number(step.step.id || 0) + 1000;
					step.step.title = "Different step title";
				}
			}
		}
		const hpt = changed.lineItems.find(
			(line) => line.uid === "line-door",
		)?.housePackageTool;
		if (hpt) {
			hpt.id = 999;
			hpt.doors[0].id = 998;
			hpt.doors[0].meta.componentTitle = "Different component title";
		}
		const mouldingRows = changed.lineItems.find(
			(line) => line.uid === "line-moulding",
		)?.meta?.mouldingRows;
		if (mouldingRows?.[0]) {
			mouldingRows[0].id = 996;
			mouldingRows[0].salesItemId = 995;
			mouldingRows[0].title = "Different moulding title";
			mouldingRows[0].img = "different.png";
		}
		const extraCost = fixtureExtraCost(changed);
		extraCost.id = 993;
		extraCost.label = "Different display label";

		expect(buildSalesRequestCommercialFingerprint(changed)).toBe(
			buildSalesRequestCommercialFingerprint(original),
		);
	});

	test("changes for line UIDs, selections, quantities, HPT, Moulding, costs, taxable state, prices, and totals", () => {
		const original = candidate();
		const baseline = buildSalesRequestCommercialFingerprint(original);
		const mutations: Array<(value: SalesRequestFinalSaveCandidate) => void> = [
			(value) => {
				value.form.customerProfileId = 8;
			},
			(value) => {
				fixtureLine(value, 0).uid = "changed-line-uid";
			},
			(value) => {
				fixtureStep(value, 0, 1).prodUid = "changed-selection";
			},
			(value) => {
				fixtureStep(value, 0, 1).stepId = 999;
			},
			(value) => {
				fixtureStep(value, 0, 1).componentId = 999;
			},
			(value) => {
				const component = required(
					fixtureStep(value, 0, 1).meta?.selectedComponents?.[0],
					"selected component",
				);
				component.id = 999;
			},
			(value) => {
				fixtureLine(value, 0).qty = 3;
			},
			(value) => {
				fixtureLine(value, 0).unitPrice = 121;
			},
			(value) => {
				fixtureLine(value, 0).taxxable = false;
			},
			(value) => {
				fixtureDoor(value).dimension = "2-8 x 6-8";
			},
			(value) => {
				fixtureDoor(value).stepProductId = 999;
			},
			(value) => {
				fixtureMouldingRow(value).qty = 4;
			},
			(value) => {
				fixtureMouldingRow(value).mouldingProductId = 999;
			},
			(value) => {
				fixtureMouldingRow(value).stepProductId = 999;
			},
			(value) => {
				fixtureExtraCost(value).amount = 25;
			},
			(value) => {
				value.summary.grandTotal = 341.8;
			},
		];

		for (const mutate of mutations) {
			const changed = structuredClone(original);
			mutate(changed);
			expect(buildSalesRequestCommercialFingerprint(changed)).not.toBe(
				baseline,
			);
		}
	});
});
