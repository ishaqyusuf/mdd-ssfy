import { expect, test } from "bun:test";
import {
	EVALUATION_FIXTURES,
	createFixtureProvider,
	evaluateSalesRequestFixture,
	evaluateSalesRequestFixtures,
	scoreNewSalesFormSeed,
} from "./harness";

test("mock evaluation covers English and Spanish explicit door facts", async () => {
	const report = await evaluateSalesRequestFixtures(
		createFixtureProvider(),
		EVALUATION_FIXTURES.filter(
			(fixture) =>
				fixture.id === "english-explicit-interior" ||
				fixture.id === "spanish-explicit-exterior",
		),
	);

	expect(report.mode).toBe("mock");
	expect(report.aggregate.caseCount).toBe(2);
	expect(report.aggregate.wholeOrderMatches).toBe(2);
	expect(report.aggregate.unsafeGuesses).toBe(0);
	expect(report.aggregate.inputTokens).toBeNull();
	expect(report.aggregate.outputTokens).toBeNull();
	expect(report.note).toContain("not model accuracy");
});

test("mock evaluation covers moulding pieces, linear feet, and ambiguous profiles", async () => {
	const report = await evaluateSalesRequestFixtures(
		createFixtureProvider(),
		EVALUATION_FIXTURES.filter((fixture) => fixture.id.startsWith("moulding-")),
	);

	expect(report.aggregate.caseCount).toBe(3);
	expect(report.aggregate.wholeOrderMatches).toBe(3);
	expect(report.aggregate.unsafeGuesses).toBe(0);
});

test("evaluation compares form steps and multi-select component UIDs semantically", () => {
	const expected = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "expected-mouldings",
				qty: 4,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: { selectedProdUids: ["baseboard", "attic-access"] },
					},
				],
				meta: {
					mouldingRows: [
						{ uid: "baseboard", qty: 3 },
						{ uid: "attic-access", qty: 1 },
					],
				},
			},
		],
		unresolved: [],
	} as const;
	const actual = {
		...expected,
		lineItems: [
			{
				...expected.lineItems[0],
				uid: "generated-mouldings",
				formSteps: [
					{
						stepId: 215,
						meta: { selectedProdUids: ["attic-access", "baseboard"] },
					},
					{ stepId: 1, prodUid: "mouldings" },
				],
			},
		],
	} as const;

	const metrics = scoreNewSalesFormSeed(expected, actual, { latencyMs: 1 });

	expect(metrics.wholeOrderMatch).toBe(true);
	expect(metrics.mismatches).toEqual([]);
});

test("evaluation flags an exact moulding profile guessed from ambiguous wording", () => {
	const fixture = EVALUATION_FIXTURES.find(
		(candidate) => candidate.id === "moulding-ambiguous-profile",
	);
	if (!fixture) throw new Error("Ambiguous moulding fixture is missing");
	const actual = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "guessed-moulding",
				qty: 25,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: { selectedProdUids: ["baseboard-wm713-16"] },
					},
				],
				meta: {
					mouldingRows: [{ uid: "baseboard-wm713-16", qty: 25 }],
				},
			},
		],
		unresolved: [],
	} as const;

	const metrics = scoreNewSalesFormSeed(fixture.expected, actual, {
		latencyMs: 1,
	});

	expect(metrics.wholeOrderMatch).toBe(false);
	expect(metrics.unsafeGuessPaths).toContain("lineItems[0].meta.mouldingRows");
});

test("ambiguous leaf count flags an unsafe guessed fact", async () => {
	const fixture = EVALUATION_FIXTURES.find(
		(candidate) => candidate.id === "ambiguous-opening-count",
	);
	if (!fixture)
		throw new Error("Ambiguous-opening evaluation fixture is missing");
	const result = await evaluateSalesRequestFixture(fixture, async () => ({
		output: {
			schemaVersion: 1,
			lineItems: [
				{
					uid: "exterior-patio-openings",
					qty: 2,
					formSteps: [
						{ stepId: 1, prodUid: "exterior-door" },
						{ stepId: 20, prodUid: "frame-fiberglass" },
						{
							stepId: 51,
							meta: { selectedProdUids: ["door-three-lite"] },
						},
						{ stepId: 66, prodUid: "threshold-standard" },
					],
					housePackageTool: {
						doors: [
							{
								dimension: "3-0 x 6-8",
								swing: "right",
								lhQty: 0,
								rhQty: 2,
							},
						],
					},
				},
			],
			unresolved: [],
		},
	}));

	if (result.status !== "ok") throw new Error(result.error);
	expect(result.metrics.unsafeGuesses).toBe(3);
	expect(result.metrics.unsafeGuessPaths).toEqual([
		"lineItems[0].housePackageTool.doors.dimension",
		"lineItems[0].housePackageTool.doors.handing",
		"lineItems[0].housePackageTool.doors.swing",
	]);
	expect(result.metrics.wholeOrderMatch).toBe(false);
});

test("evaluation ignores transient line UIDs but keeps unresolved references coherent", () => {
	const fixture = EVALUATION_FIXTURES.find(
		(candidate) => candidate.id === "ambiguous-opening-count",
	);
	if (!fixture)
		throw new Error("Ambiguous-opening evaluation fixture is missing");

	const generated = structuredClone(fixture.expected);
	const generatedLine = generated.lineItems[0];
	const unresolved = generated.unresolved[0];
	if (!generatedLine || !unresolved)
		throw new Error("Fixture must contain a line and unresolved reference");
	generatedLine.uid = "model-generated-line-1";
	unresolved.lineUid = generatedLine.uid;

	const regeneratedMetrics = scoreNewSalesFormSeed(
		fixture.expected,
		generated,
		{ latencyMs: 1 },
	);
	expect(regeneratedMetrics.wholeOrderMatch).toBe(true);
	expect(regeneratedMetrics.mismatches).toEqual([]);

	unresolved.lineUid = "wrong-line-reference";
	const incoherentMetrics = scoreNewSalesFormSeed(fixture.expected, generated, {
		latencyMs: 1,
	});
	expect(incoherentMetrics.wholeOrderMatch).toBe(false);
	expect(incoherentMetrics.mismatches[0]?.path).toBe(
		"unresolved.lineReferences",
	);
});

test("evaluation reports provider token usage and latency when supplied", async () => {
	const fixture = EVALUATION_FIXTURES.find(
		(candidate) => candidate.id === "english-explicit-interior",
	);
	if (!fixture) throw new Error("English evaluation fixture is missing");
	const result = await evaluateSalesRequestFixtures(
		async () => ({
			output: fixture.providerOutput,
			inputTokens: 17,
			outputTokens: 23,
		}),
		[fixture],
		"live",
	);

	expect(result.aggregate.inputTokens).toBe(17);
	expect(result.aggregate.outputTokens).toBe(23);
	expect(result.aggregate.usageComplete).toBe(true);
	expect(result.aggregate.averageLatencyMs).toBeGreaterThanOrEqual(0);
});

test("evaluation compares v2 services semantically and ignores transient row UIDs", () => {
	const expected = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "expected-line",
				qty: 2,
				formSteps: [{ stepId: 1, prodUid: "services" }],
				meta: {
					serviceRows: [
						{ uid: "expected-install", service: "Field Install", qty: 1 },
						{ uid: "expected-cleanup", service: "Cleanup", qty: 1 },
					],
				},
			},
		],
		form: { deliveryOption: "delivery" },
		extraCosts: [{ id: null, label: "Delivery", type: "Delivery", amount: 45 }],
		unresolved: [],
	} as const;
	const actual = {
		...expected,
		lineItems: [
			{
				...expected.lineItems[0],
				uid: "generated-line",
				meta: {
					serviceRows: [
						{ uid: "generated-cleanup", service: " cleanup ", qty: 1 },
						{
							uid: "generated-install",
							service: "FIELD   INSTALL",
							qty: 1,
						},
					],
				},
			},
		],
	} as const;

	const metrics = scoreNewSalesFormSeed(expected, actual, { latencyMs: 1 });

	expect(metrics.wholeOrderMatch).toBe(true);
	expect(metrics.mismatches).toEqual([]);
});

test("evaluation rejects missing or invented v2 service and delivery facts", () => {
	const expected = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "service-line",
				qty: 1,
				formSteps: [{ stepId: 1, prodUid: "services" }],
				meta: {
					serviceRows: [
						{ uid: "expected-service", service: "Install", qty: 1 },
					],
				},
			},
		],
		form: { deliveryOption: "pickup" },
		unresolved: [],
	} as const;
	const missing = {
		...expected,
		lineItems: [
			{
				uid: "service-line",
				qty: 1,
				formSteps: [{ stepId: 1, prodUid: "services" }],
			},
		],
		form: undefined,
	} as const;
	const invented = {
		...expected,
		form: { deliveryOption: "delivery" },
		extraCosts: [{ id: null, label: "Delivery", type: "Delivery", amount: 75 }],
	} as const;

	const missingMetrics = scoreNewSalesFormSeed(expected, missing, {
		latencyMs: 1,
	});
	const inventedMetrics = scoreNewSalesFormSeed(expected, invented, {
		latencyMs: 1,
	});

	expect(missingMetrics.wholeOrderMatch).toBe(false);
	expect(missingMetrics.mismatches.map(({ path }) => path)).toEqual([
		"lineItems[0].meta.serviceRows",
		"form.deliveryOption",
	]);
	expect(inventedMetrics.wholeOrderMatch).toBe(false);
	expect(inventedMetrics.mismatches.map(({ path }) => path)).toEqual([
		"form.deliveryOption",
		"extraCosts",
	]);
	expect(inventedMetrics.unsafeGuessPaths).toEqual([
		"form.deliveryOption",
		"extraCosts",
	]);
});
