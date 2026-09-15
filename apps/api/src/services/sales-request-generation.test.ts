import { expect, test } from "bun:test";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { generateNewSalesFormSeed } from "./sales-request-generation";

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

test("rejects an exact moulding profile guessed from generic category wording", async () => {
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
	).resolves.toMatchObject({ seed });
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
	).resolves.toMatchObject({ seed });
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

test("DeepSeek applies confirmed quantity before cross-field validation", async () => {
 const {createSalesRequestProvider}=await import("./sales-request-provider");
 const title="BASEBOARD WM713 3-1/4 X 9/16 X 16";
 const pending={...mouldingLinearFeetSeed,lineItems:[{...mouldingLinearFeetSeed.lineItems[0],qty:0,meta:{mouldingRows:[{uid:"baseboard-16",qty:28}]}}],unresolved:[]};
 const provider=createSalesRequestProvider({selection:{provider:"deepseek",model:"deepseek-flash"},environment:{SALES_REQUEST_DEEPSEEK_API_KEY:"test"},generateTextImpl:(async()=>({output:pending,text:JSON.stringify(pending),usage:{inputTokens:1,outputTokens:1}})) as any});
 const result=await generateNewSalesFormSeed({...input,text:title,groundingText:`${title} Quantity: 28`,configurationJson:JSON.stringify(mouldingConfiguration),clarifications:[{question:"Quantity?",field:"quantity",sourceText:title,answer:"28"}]},provider);
 expect(result.seed.lineItems[0]?.qty).toBe(28);
});
