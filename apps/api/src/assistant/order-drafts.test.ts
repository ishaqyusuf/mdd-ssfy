import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SalesRequestProviderExecutionError } from "../services/sales-request-provider";
import {
	type AssistantDraftRuntime,
	type AssistantSalesRequestDraftDependencies,
	createAssistantSalesRequestDraft,
	executeAssistantSalesRequestDraft,
} from "./order-drafts";

let previousFeatureFlag: string | undefined;

beforeEach(() => {
	previousFeatureFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "false";
});

afterEach(() => {
	process.env.SALES_REQUEST_AI_ENABLED = previousFeatureFlag;
});

describe("Assistant Sales Request orchestration", () => {
	test("fails at pilot authorization before reading configuration or invoking a provider", async () => {
		let transactionCalls = 0;
		await expect(
			createAssistantSalesRequestDraft(
				{
					userId: 42,
					scopeType: "organization",
					scopeId: "7",
					grants: { editOrders: true },
				},
				{ type: "order", text: "Two configured doors for delivery." },
				new AbortController().signal,
				{
					$transaction: async () => {
						transactionCalls += 1;
						throw new Error("snapshot should not be read");
					},
				} as never,
			),
		).rejects.toThrow("currently disabled");
		expect(transactionCalls).toBe(0);
	});

	test("returns a native preview after the complete guarded lifecycle", async () => {
		const events: string[] = [];
		const snapshot = previewSnapshot();
		const dependencies: AssistantSalesRequestDraftDependencies = {
			authorize: async () => {
				events.push("authorize");
			},
			reserveUsage: async () => {
				events.push("reserve-usage");
			},
			readSnapshot: async () => {
				events.push("read-snapshot");
				return snapshot;
			},
			createProvider:
				() =>
				async ({ signal }) => {
					expect(signal.aborted).toBe(false);
					events.push("provider");
					return {
						output: unresolvedSeed,
						provider: "openai",
						model: "gpt-5-mini",
						inputTokens: 120,
						outputTokens: 40,
					};
				},
			telemetry: {
				beginRun: async () => {
					events.push("telemetry-begin");
				},
				markProviderAttempted: async () => {
					events.push("telemetry-attempt");
				},
				completeRun: async (event) => {
					events.push(`telemetry-complete:${event.status}`);
				},
			},
		};

		const result = await executeAssistantSalesRequestDraft(
			{ type: "order", text: "Two configured doors for delivery." },
			new AbortController().signal,
			dependencies,
		);

		expect(result).toMatchObject({
			seed: unresolvedSeed,
			configurationScope: "sales-settings:3",
			configurationRevision: "catalog-revision-4",
			provider: "openai",
			model: "gpt-5-mini",
			usage: { inputTokens: 120, outputTokens: 40 },
		});
		expect(events).toEqual([
			"authorize",
			"read-snapshot",
			"telemetry-begin",
			"reserve-usage",
			"telemetry-attempt",
			"provider",
			"read-snapshot",
			"telemetry-complete:succeeded",
		]);
	});

	test("records a terminal provider failure without returning a partial draft", async () => {
		const terminalStatuses: string[] = [];
		await expect(
			executeAssistantSalesRequestDraft(
				{ type: "quote", text: "Quote one configured door." },
				new AbortController().signal,
				{
					authorize: async () => {},
					reserveUsage: async () => {},
					readSnapshot: async () => previewSnapshot(),
					createProvider: () => async () => {
						throw new SalesRequestProviderExecutionError({
							stage: "provider-api",
						});
					},
					telemetry: {
						beginRun: async () => {},
						markProviderAttempted: async () => {},
						completeRun: async (event) => {
							terminalStatuses.push(event.status);
						},
					},
				},
			),
		).rejects.toThrow("provider could not generate");
		expect(terminalStatuses).toEqual(["provider-error"]);
	});

	test("assembles published authority and actor-bound telemetry in the production adapter", async () => {
		const actorUserIds: number[] = [];
		const runtime = draftRuntime({
			telemetry: {
				beginRun: async (_database, event) => {
					actorUserIds.push(event.actorUserId);
				},
				markProviderAttempted: async (_database, event) => {
					actorUserIds.push(event.actorUserId);
				},
				completeRun: async (_database, event) => {
					actorUserIds.push(event.actorUserId);
				},
			},
		});
		const result = await createAssistantSalesRequestDraft(
			assistantActor,
			{ type: "order", text: "Two configured doors for delivery." },
			new AbortController().signal,
			{} as never,
			runtime,
		);
		expect(result.configurationRevision).toBe("catalog-revision-4");
		expect(actorUserIds).toEqual([42, 42, 42]);
	});

	test("rejects stale or revision-mismatched publication before paid work", async () => {
		let reserved = false;
		let providerCalled = false;
		for (const publication of [
			{
				status: "stale" as const,
				publishedRevision: "catalog-revision-4",
			},
			{
				status: "published" as const,
				publishedRevision: "older-catalog-revision",
			},
		]) {
			const runtime = draftRuntime({
				reserveUsage: async () => {
					reserved = true;
				},
				readAuthoritySnapshot: async () => ({
					context: previewSnapshot(),
					publication,
				}),
				createProvider: () => async () => {
					providerCalled = true;
					return { output: unresolvedSeed };
				},
			});
			await expect(
				createAssistantSalesRequestDraft(
					assistantActor,
					{ type: "quote", text: "Quote one configured door." },
					new AbortController().signal,
					{} as never,
					runtime,
				),
			).rejects.toThrow("published Sales Request catalog is unavailable");
		}
		expect(reserved).toBe(false);
		expect(providerCalled).toBe(false);
	});

	test("honors the Assistant provider kill switch before paid draft work", async () => {
		let reserved = false;
		let providerCalled = false;
		const runtime = draftRuntime({
			reserveUsage: async () => {
				reserved = true;
			},
			createProvider: () => async () => {
				providerCalled = true;
				return { output: unresolvedSeed };
			},
		});
		await expect(
			createAssistantSalesRequestDraft(
				assistantActor,
				{ type: "order", text: "Two configured doors for delivery." },
				new AbortController().signal,
				{} as never,
				runtime,
				{ ASSISTANT_DISABLED_PROVIDERS: "openai" },
			),
		).rejects.toThrow("provider is disabled");
		expect(reserved).toBe(false);
		expect(providerCalled).toBe(false);
	});
});

const assistantActor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { editOrders: true },
};

const unresolvedSeed = {
	schemaVersion: 1 as const,
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

function previewSnapshot() {
	const configuration = {
		schemaVersion: 1 as const,
		routes: [],
		steps: [],
		visibilityByComponentUid: {},
	};
	return {
		settingId: 3,
		scope: "sales-settings:3",
		revision: "catalog-revision-4",
		configurationJson: JSON.stringify(configuration),
		configuration,
		aiSelection: { provider: "openai" as const, model: "gpt-5-mini" },
		pilotSettingsRevision: 1,
		providerBenchmarkApprovalRevision: 1,
	};
}

function draftRuntime(
	overrides: Partial<AssistantDraftRuntime> = {},
): AssistantDraftRuntime {
	return {
		authorize: async () => {},
		reserveUsage: async () => {},
		readAuthoritySnapshot: async () => ({
			context: previewSnapshot(),
			publication: {
				status: "published",
				publishedRevision: "catalog-revision-4",
			},
		}),
		createProvider: () => async () => ({
			output: unresolvedSeed,
			provider: "openai",
			model: "gpt-5-mini",
		}),
		telemetry: {
			beginRun: async () => {},
			markProviderAttempted: async () => {},
			completeRun: async () => {},
		},
		...overrides,
	};
}
