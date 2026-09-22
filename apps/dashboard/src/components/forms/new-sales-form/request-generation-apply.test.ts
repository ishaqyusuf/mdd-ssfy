import { describe, expect, test } from "bun:test";
import {
	type CustomerProfileRecord,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	createEmptySalesFormLineItem,
	hydrateSalesFormRecord,
} from "@gnd/sales/sales-form";
import {
	applySalesRequestGenerationProposal,
	createFreshStepComponentsResolver,
	getSalesRequestGenerationProposalId,
	resolveSalesRequestProfileCoefficient,
} from "./request-generation-apply";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import type { NewSalesFormRecord } from "./schema";

const routeData: WorkflowRouteData = {
	rootStepUid: "item-type",
	composedRouter: {
		interior: {
			routeSequence: [{ uid: "finish" }],
			config: {},
			requestGeneration: {
				defaults: { finish: "default-finish" },
			},
		},
	},
	stepsById: { 1: "item-type", 2: "finish" },
	stepsByUid: {
		"item-type": { id: 1, uid: "item-type", title: "Item Type" },
		finish: { id: 2, uid: "finish", title: "Finish" },
	},
};

const components: Record<number, WorkflowComponentRecord[]> = {
	1: [
		{
			id: 1,
			uid: "interior",
			title: "Interior Doors",
			basePrice: 100,
			_metaData: { visible: true },
		},
	],
	2: [
		{
			id: 2,
			uid: "finish",
			title: "Smooth",
			basePrice: 20,
			_metaData: { visible: true },
		},
	],
};

const preview = {
	generationId: "11111111-1111-4111-8111-111111111111",
	configurationScope: "sales-settings:7",
	configurationRevision: "config-1",
	provider: "openai",
	model: "gpt-5-mini",
	seed: {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "generated-line",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "interior" },
					{ stepId: 2, prodUid: "finish" },
				],
			},
		],
		unresolved: [],
	},
} as unknown as SalesRequestGeneratePreviewOutput;

function createRecord(customerProfileId: number | null = null) {
	return hydrateSalesFormRecord({
		type: "quote",
		salesId: null,
		slug: null,
		version: "new-session-1",
		form: { customerId: 10, customerProfileId },
		lineItems: [createEmptySalesFormLineItem(0)],
		extraCosts: [],
		summary: { taxRate: 0 },
	}) as NewSalesFormRecord;
}

function applyInput(
	overrides: Partial<
		Parameters<typeof applySalesRequestGenerationProposal>[0]
	> = {},
) {
	return {
		preview,
		proposalId: "proposal-1",
		baseRecord: createRecord(),
		routeData,
		profileRecords: [] as CustomerProfileRecord[],
		validateConfigurationRevision: () => "config-1",
		resolveComponents: ({ step }: { step: { id?: number | null } }) =>
			components[Number(step.id)] || [],
		applyProposal: () => ({ status: "applied" as const }),
		...overrides,
	};
}

describe("sales request generation apply boundary", () => {
	test("preserves exact customer text on reviewed proposals without modifying the base", async () => {
		const sourceText = '  Original request\r\n1 attic kit <script>alert(1)</script>  ';
		const baseRecord = createRecord();
		const result = await applySalesRequestGenerationProposal(applyInput({
			baseRecord,
			preview: { ...preview, sourceText, userReviewed: true },
			performApply: false,
		}));
		expect(result.status).toBe("ready");
		if (result.status !== "ready") throw new Error("Expected prepared proposal");
		expect(result.proposal.record.form.customerRequestText).toBe(sourceText);
		expect(result.proposal.lowTouchClaim).toBeNull();
		expect(baseRecord.form.customerRequestText).toBeNull();
	});

	test("keeps preview preparation inert until the atomic apply callback", async () => {
		const baseRecord = createRecord();
		let applyCalls = 0;
		const result = await applySalesRequestGenerationProposal({
			...applyInput({ baseRecord }),
			applyProposal: () => {
				applyCalls += 1;
				return { status: "applied" as const };
			},
			performApply: false,
		});

		expect(result.status).toBe("ready");
		if (result.status === "ready") {
			expect(result.proposal.lowTouchClaim).toMatchObject({
				source: "pasted-text",
				generationId: preview.generationId,
				configurationScope: preview.configurationScope,
				configurationRevision: preview.configurationRevision,
				provider: preview.provider,
				model: preview.model,
			});
			expect(result.proposal.lowTouchClaim?.seed).toEqual(preview.seed);
		}
		expect(applyCalls).toBe(0);
		expect(baseRecord.lineItems).toHaveLength(1);
	});

	test("blocks any unresolved seed before initializer or store mutation", async () => {
		const unresolvedPreview = structuredClone(preview);
		unresolvedPreview.seed.unresolved.push({
			lineUid: "generated-line",
			stepId: 2,
			field: "Finish",
			status: "ambiguous",
			reason: "Two finishes match.",
		});
		let applyCalls = 0;
		const result = await applySalesRequestGenerationProposal({
			...applyInput({ preview: unresolvedPreview }),
			applyProposal: () => {
				applyCalls += 1;
				return { status: "applied" as const };
			},
		});

		expect(result).toMatchObject({ status: "blocked", reason: "unresolved" });
		expect(applyCalls).toBe(0);
	});

	test("allows unresolved facts only for an explicit review-only handoff", async () => {
		const unresolvedPreview = structuredClone(preview);
		const unresolvedLine = unresolvedPreview.seed.lineItems[0];
		if (!unresolvedLine) throw new Error("Expected generated line");
		unresolvedLine.formSteps = [{ stepId: 1, prodUid: "interior" }];
		unresolvedPreview.seed.unresolved.push({
			lineUid: "generated-line",
			stepId: 2,
			field: "Finish",
			status: "ambiguous",
			reason: "Two finishes match.",
		});
		let proposalUnresolved = 0;
		let reviewNotes: { lineUid: string | null; reason: string }[] | null | undefined;
		const result = await applySalesRequestGenerationProposal({
			...applyInput({ preview: unresolvedPreview }),
			allowUnresolvedDraft: true,
			applyProposal: (proposal) => {
				proposalUnresolved = proposal.unresolved.length;
				reviewNotes = proposal.record.form.customerRequestReview;
				return { status: "applied" as const };
			},
		});

		expect(result.status).toBe("applied");
		expect(proposalUnresolved).toBe(1);
		expect(reviewNotes).toEqual([
			{
				lineUid: null,
				reason: "Review unspecified details and any draft defaults before saving.",
			},
			{ lineUid: "generated-line", reason: "Two finishes match." },
		]);
	});

	test("requires a current configuration validator and rejects a stale revision", async () => {
		let applyCalls = 0;
		const result = await applySalesRequestGenerationProposal({
			...applyInput({ validateConfigurationRevision: () => "config-2" }),
			applyProposal: () => {
				applyCalls += 1;
				return { status: "applied" as const };
			},
		});

		expect(result).toEqual({
			status: "configuration-stale",
			expectedRevision: "config-1",
			currentRevision: "config-2",
		});
		expect(applyCalls).toBe(0);
	});

	test("maps a validator CONFLICT to a stale configuration result", async () => {
		const result = await applySalesRequestGenerationProposal({
			...applyInput({
				validateConfigurationRevision: () =>
					Promise.reject({ data: { code: "CONFLICT" } }),
			}),
		});

		expect(result).toEqual({
			status: "configuration-stale",
			expectedRevision: "config-1",
			currentRevision: "changed",
		});
	});

	test("prepares a native candidate with fresh components, defaults, profile pricing, then applies", async () => {
		const requests: Array<Record<string, unknown>> = [];
		let applyCalls = 0;
		const result = await applySalesRequestGenerationProposal({
			...applyInput({
				profileRecords: [{ id: 7, coefficient: 0.5 }],
				baseRecord: createRecord(7),
			}),
			resolveComponents: ({ step }) => {
				requests.push({ stepId: step.id, stepTitle: step.title, fresh: true });
				return components[Number(step.id)] || [];
			},
			applyProposal: (proposal, revision) => {
				applyCalls += 1;
				expect(revision).toBe("config-1");
				expect(proposal.record.lineItems[0]?.title).toBe("Interior Doors");
				return { status: "applied" as const };
			},
		});

		expect(result.status).toBe("applied");
		expect(applyCalls).toBe(1);
		expect(requests).toEqual([
			{ stepId: 1, stepTitle: "Item Type", fresh: true },
			{ stepId: 2, stepTitle: "Finish", fresh: true },
		]);
	});

	test("blocks an unresolved selected customer profile", async () => {
		const result = await applySalesRequestGenerationProposal({
			...applyInput({
				baseRecord: createRecord(99),
				profileRecords: [{ id: 7, coefficient: 0.5 }],
			}),
		});

		expect(result).toMatchObject({
			status: "blocked",
			reason: "profile-unavailable",
		});
	});

	test("returns a safe failure when authoritative component loading fails", async () => {
		const result = await applySalesRequestGenerationProposal({
			...applyInput({
				resolveComponents: () => Promise.reject(new Error("catalog failed")),
			}),
		});

		expect(result).toMatchObject({ status: "error" });
	});

	test("uses coefficient one without a profile and blocks a malformed coefficient", () => {
		expect(resolveSalesRequestProfileCoefficient(createRecord(), [])).toEqual({
			status: "ready",
			profileCoefficient: 1,
		});
		expect(
			resolveSalesRequestProfileCoefficient(createRecord(7), [
				{ id: 7, coefficient: 0 },
			]),
		).toMatchObject({ status: "blocked", reason: "profile-invalid" });
	});

	test("marks the fresh resolver contract explicitly", async () => {
		const calls: Array<Record<string, unknown>> = [];
		const resolver = createFreshStepComponentsResolver({
			sales: {
				getStepComponents: {
					query: async (input: Record<string, unknown>) => {
						calls.push(input);
						return components[1] || [];
					},
				},
			},
		});

		await resolver({
			lineUid: "line-1",
			step: { id: 1, title: "Item Type" },
		});

		expect(calls).toEqual([{ stepId: 1, stepTitle: "Item Type", fresh: true }]);
	});

	test("uses the server generation identity for idempotence across remounts", () => {
		expect(
			getSalesRequestGenerationProposalId({
				generationId: "generation-42",
			} as never),
		).toBe("generation-42");
		expect(
			getSalesRequestGenerationProposalId({
				generationId: " generation-43 ",
			} as never),
		).toBe("generation-43");
		expect(getSalesRequestGenerationProposalId(null)).toBeNull();
	});
});

test("manually reviewed selections do not receive an unchanged AI final-save claim", async () => {
	const result = await applySalesRequestGenerationProposal(
		applyInput({
			preview: { ...preview, userReviewed: true },
			performApply: false,
		}),
	);
	expect(result.status).toBe("ready");
	if (result.status === "ready")
		expect(result.proposal.lowTouchClaim).toBeNull();
});

test("an unset profile coefficient uses the native neutral multiplier", () => {
 expect(resolveSalesRequestProfileCoefficient(createRecord(7), [{id: 7, coefficient: null}])).toEqual({status: "ready", profileCoefficient: 1});
});
