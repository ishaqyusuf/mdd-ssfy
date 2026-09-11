import { expect, test } from "bun:test";
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
				{ stepId: 3, meta: { selectedProdUids: ["panel", "lite"] } },
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

test("returns a validated native new-sales-form seed", async () => {
	const result = await generateNewSalesFormSeed(input, async () => ({
		output: validSeed,
		provider: "anthropic",
		model: "configured-model",
	}));

	expect(result.seed).toEqual(validSeed);
	expect(result.configurationRevision).toBe("test-1");
	expect(result.promptVersion).toBe("new-sales-form-seed-v2");
	expect(result.provider).toBe("anthropic");
	expect(result.model).toBe("configured-model");
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
