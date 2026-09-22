import { expect, test } from "bun:test";
import { interpretationWarningKey } from "./sales-request-interpretation-warning";
import {
	createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "./sales-request-preview";
import { SalesRequestProviderExecutionError } from "./sales-request-provider";

const source = {
	text: "one door",
	images: [],
	signal: new AbortController().signal,
};
const configuration = {
	schemaVersion: 1 as const,
	routes: [],
	steps: [],
	visibilityByComponentUid: {},
};
const snapshot = {
	settingId: 3,
	scope: "sales-settings:3",
	revision: "one",
	configurationJson: JSON.stringify(configuration),
	configuration,
	aiSelection: { provider: "openai" as const, model: "gpt-5-mini" },
	pilotSettingsRevision: 1,
	providerBenchmarkApprovalRevision: 1,
};
const output = {
	schemaVersion: 1,
	lineItems: [],
	unresolved: [
		{
			lineUid: null,
			stepId: null,
			field: "request",
			status: "unsupported" as const,
			reason: "No configured item route matches the request",
		},
	],
};
const resolvedConfiguration = {
	schemaVersion: 1 as const,
	routes: [
		{
			itemTypeUid: "exterior",
			rootStepId: 1,
			stepUids: ["frame", "door"],
		},
	],
	steps: [
		{
			id: 1,
			uid: "type",
			selectionMode: "single" as const,
			components: [["exterior", "Exterior"]],
		},
		{
			id: 2,
			uid: "frame",
			selectionMode: "single" as const,
			components: [["pvc", "PVC"]],
		},
		{
			id: 3,
			uid: "door",
			selectionMode: "multiple" as const,
			components: [["panel", "Panel"]],
		},
	],
	visibilityByComponentUid: {},
};
const resolvedOutput = {
	schemaVersion: 1 as const,
	lineItems: [
		{
			uid: "line-1",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "exterior" },
				{ stepId: 2, prodUid: "pvc" },
				{ stepId: 3, meta: { selectedProdUids: ["panel"] } },
			],
		},
	],
	unresolved: [],
};
const telemetry = {
	beginRun: async () => {},
	markProviderAttempted: async () => {},
	completeRun: async () => {},
};

test("unauthorized preview reads no configuration and invokes no model", async () => {
	let touched = false;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {
				throw new Error("unauthorized");
			},
			reserveUsage: async () => {},
			readSnapshot: async () => {
				touched = true;
				return snapshot;
			},
			createProvider: () => async () => {
				touched = true;
				return { output };
			},
			telemetry,
		}),
	).rejects.toThrow("unauthorized");
	expect(touched).toBe(false);
});

test("usage denial prevents paid provider calls", async () => {
	let providerCalled = false;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {
				throw new Error("quota");
			},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				providerCalled = true;
				return { output };
			},
			telemetry,
		}),
	).rejects.toThrow("quota");
	expect(providerCalled).toBe(false);
});

test("provider failure returns no partial response", async () => {
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				throw new Error("provider details must be redacted");
			},
			telemetry,
		}),
	).rejects.toThrow("provider could not generate");
});

test("provider failures retain bounded usage metadata without retaining output", async () => {
	const events: Array<{ kind: string; value: unknown }> = [];
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				throw new SalesRequestProviderExecutionError({
					stage: "structured-output",
					configurationIssue: "route",
					routeFailureKind: "outside-step",
					finishReason: "stop",
					inputTokens: 321,
					outputTokens: 45,
				});
			},
			telemetry: {
				beginRun: (event) => events.push({ kind: "start", value: event }),
				markProviderAttempted: (event) =>
					events.push({ kind: "provider-attempt", value: event }),
				completeRun: (event) => events.push({ kind: "complete", value: event }),
			},
		}),
	).rejects.toThrow("provider could not generate");

	expect(events).toHaveLength(3);
	expect(events[2]).toMatchObject({
		kind: "complete",
		value: {
			status: "provider-error",
			failureStage: "structured-output",
			issueCounts: { providerFailure: {
				finishReason: "stop",
				configurationIssue: "route",
				routeFailureKind: "outside-step",
			} },
			inputTokens: 321,
			outputTokens: 45,
		},
	});
	expect(JSON.stringify(events)).not.toMatch(/private provider output/i);
});

test("configuration changes while the model runs prevent a stale seed response", async () => {
	let reads = 0;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot,
				revision: ++reads === 1 ? "one" : "two",
			}),
			createProvider: () => async () => ({ output }),
			telemetry,
		}),
	).rejects.toThrow("configuration changed");
});

test("successful preview returns only the validated seed and configuration identity", async () => {
	const events: Array<{ kind: string; value: unknown }> = [];
	const result = await createSalesRequestPreview(source, {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => ({ output }),
		telemetry: {
			beginRun: (event) => events.push({ kind: "start", value: event }),
			markProviderAttempted: (event) =>
				events.push({ kind: "provider-attempt", value: event }),
			completeRun: (event) => events.push({ kind: "complete", value: event }),
		},
	});

	expect(result.seed).toEqual(output);
	expect(result.configurationRevision).toBe("one");
	expect(result.configurationScope).toBe("sales-settings:3");
	expect(result.generationId).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
	expect(result).not.toHaveProperty("draftPreparation");
	expect(events).toHaveLength(3);
	expect(events[0]).toMatchObject({
		kind: "start",
		value: {
			generationId: result.generationId,
			scope: "sales-settings:3",
			configurationRevision: "one",
			pilotSettingsRevision: 1,
			providerBenchmarkApprovalRevision: 1,
			hasText: true,
		},
	});
	expect(events[1]).toMatchObject({
		kind: "provider-attempt",
		value: { generationId: result.generationId },
	});
	expect(events[2]).toMatchObject({
		kind: "complete",
		value: {
			generationId: result.generationId,
			status: "succeeded",
			seedDigest: expect.stringMatching(/^h1:[a-f0-9]{64}$/),
		},
	});
	expect(events[2]?.value).not.toHaveProperty("requestComplexityVersion");
	expect(events[2]?.value).not.toHaveProperty("requestComplexityStratum");
	expect(JSON.stringify(events)).not.toMatch(/one door|base64|private/i);
});

test("successful resolved preview records only its coarse request shape", async () => {
	const events: Array<{ kind: string; value: unknown }> = [];
	await createSalesRequestPreview(source, {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => ({
			...snapshot,
			configuration: resolvedConfiguration,
			configurationJson: JSON.stringify(resolvedConfiguration),
		}),
		createProvider: () => async () => ({ output: resolvedOutput }),
		telemetry: {
			beginRun: (event) => events.push({ kind: "start", value: event }),
			markProviderAttempted: (event) =>
				events.push({ kind: "provider-attempt", value: event }),
			completeRun: (event) => events.push({ kind: "complete", value: event }),
		},
	});

	expect(events.at(-1)).toMatchObject({
		kind: "complete",
		value: {
			status: "succeeded",
			requestComplexityVersion: "request-shape-v1",
			requestComplexityStratum: "standard",
		},
	});
	expect(JSON.stringify(events.at(-1))).not.toMatch(
		/line-1|exterior|pvc|panel|one door/i,
	);
});

test("enabled global interpretation rule suppresses its validated warning", async () => {
	const warning = {
		lineUid: "line-1",
		stepId: 3,
		field: "door product",
		sourceText: "door",
		selectedProdUid: "panel",
		selectedTitle: "Panel",
		reason: "Matched the only compatible panel.",
	};
	const result = await createSalesRequestPreview(source, {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => ({
			...snapshot,
			configuration: resolvedConfiguration,
			configurationJson: JSON.stringify(resolvedConfiguration),
			adminRulesRevision: 2,
			adminRules: [
				{
					id: `interpretation-warning:${interpretationWarningKey(warning)}`,
					title: "Approved door mapping",
					instruction: "Use Panel for door.",
					suppressWarning: true,
				},
			],
		}),
		createProvider: () => async () => ({
			output: { ...resolvedOutput, interpretations: [warning] },
		}),
		telemetry,
	});
	expect(result.seed.interpretations).toEqual([]);
	expect(result.seed.lineItems[0]?.formSteps).toEqual(
		resolvedOutput.lineItems[0]?.formSteps,
	);
});

test("usage denial closes the metadata-only lifecycle without a provider call", async () => {
	const events: Array<{ kind: string; value: unknown }> = [];
	let providerCalled = false;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {
				throw new Error("quota");
			},
			readSnapshot: async () => snapshot,
			createProvider: () => async () => {
				providerCalled = true;
				return { output };
			},
			telemetry: {
				beginRun: (event) => events.push({ kind: "start", value: event }),
				markProviderAttempted: (event) =>
					events.push({ kind: "provider-attempt", value: event }),
				completeRun: (event) => events.push({ kind: "complete", value: event }),
			},
		}),
	).rejects.toThrow("quota");
	expect(providerCalled).toBe(false);
	expect(events).toHaveLength(2);
	expect(events[1]).toMatchObject({
		kind: "complete",
		value: { status: "usage-denied" },
	});
});

test("provider settings changes while the model runs prevent a stale seed response", async () => {
	let reads = 0;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot,
				aiSelection:
					++reads === 1
						? snapshot.aiSelection
						: { provider: "google" as const, model: "gemini-3.8-flash" },
			}),
			createProvider: () => async () => ({ output }),
			telemetry,
		}),
	).rejects.toThrow("configuration changed");
});

test("pilot authority changes while the model runs prevent a stale seed response", async () => {
	let reads = 0;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => ({
				...snapshot,
				pilotSettingsRevision: ++reads === 1 ? 1 : 2,
			}),
			createProvider: () => async () => ({ output }),
			telemetry,
		}),
	).rejects.toThrow("configuration changed");
});

test("durable telemetry start failure prevents usage reservation and provider work", async () => {
	let reserved = false;
	let providerCreated = false;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {
				reserved = true;
			},
			readSnapshot: async () => snapshot,
			createProvider: () => {
				providerCreated = true;
				return async () => ({ output });
			},
			telemetry: {
				beginRun: async () => {
					throw new Error("telemetry unavailable");
				},
				markProviderAttempted: async () => {},
				completeRun: async () => {},
			},
		}),
	).rejects.toThrow("telemetry unavailable");
	expect(reserved).toBe(false);
	expect(providerCreated).toBe(false);
});

test("completion failure preserves a generated preview but leaves incomplete evidence", async () => {
	let providerCalls = 0;
	const result = await createSalesRequestPreview(source, {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => {
			providerCalls += 1;
			return { output };
		},
		telemetry: {
			beginRun: async () => {},
			markProviderAttempted: async () => {},
			completeRun: async () => {
				throw new Error("completion unavailable");
			},
		},
	});
	expect(providerCalls).toBe(1);
	expect(result.seed).toEqual(output);
});

test("provider-attempt persistence failure prevents provider construction and invocation", async () => {
	let providerCreated = false;
	let providerCalled = false;
	await expect(
		createSalesRequestPreview(source, {
			authorize: async () => {},
			reserveUsage: async () => {},
			readSnapshot: async () => snapshot,
			createProvider: () => {
				providerCreated = true;
				return async () => {
					providerCalled = true;
					return { output };
				};
			},
			telemetry: {
				beginRun: async () => {},
				markProviderAttempted: async () => {
					throw new Error("provider evidence unavailable");
				},
				completeRun: async () => {},
			},
		}),
	).rejects.toThrow("provider evidence unavailable");
	expect(providerCreated).toBe(false);
	expect(providerCalled).toBe(false);
});

test("settings selection matches the new sales form's lowest active record", () => {
	expect(selectSalesRequestSettingId([4, 3])).toBe(3);
	expect(selectSalesRequestSettingId([3])).toBe(3);
});

test("enabled admin context reaches provider and rule changes invalidate in-flight preview", async () => {
	const adminRules = [
		{ title: "Terminology", instruction: "Preserve room names." },
	];
	let reads = 0;
	let received: unknown;
	await expect(
		createSalesRequestPreview(
			{
				...source,
				clarifications: [{ question: "Finish?", answer: "Primed" }],
			},
			{
				authorize: async () => {},
				reserveUsage: async () => {},
				telemetry,
				readSnapshot: async () => ({
					...snapshot,
					adminRules,
					adminRulesRevision: ++reads,
				}),
				createProvider: () => async (input) => {
					received = input;
					return { output };
				},
			},
		),
	).rejects.toThrow("Sales configuration changed");
	expect(received).toMatchObject({
		text: source.text,
		adminRules,
		clarifications: [{ question: "Finish?", answer: "Primed" }],
	});
});
