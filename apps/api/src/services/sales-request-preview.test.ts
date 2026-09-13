import { expect, test } from "bun:test";
import {
	createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "./sales-request-preview";

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
		}),
	).rejects.toThrow("provider could not generate");
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
			onStart: (event) => events.push({ kind: "start", value: event }),
			onComplete: (event) => events.push({ kind: "complete", value: event }),
		},
	});

	expect(result.seed).toEqual(output);
	expect(result.configurationRevision).toBe("one");
	expect(result.configurationScope).toBe("sales-settings:3");
	expect(result.generationId).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
	expect(result).not.toHaveProperty("draftPreparation");
	expect(events).toHaveLength(2);
	expect(events[0]).toMatchObject({
		kind: "start",
		value: {
			generationId: result.generationId,
			scope: "sales-settings:3",
			configurationRevision: "one",
			hasText: true,
		},
	});
	expect(events[1]).toMatchObject({
		kind: "complete",
		value: {
			generationId: result.generationId,
			status: "succeeded",
			seedDigest: expect.stringMatching(/^h1:[a-f0-9]{64}$/),
		},
	});
	expect(JSON.stringify(events)).not.toMatch(/one door|base64|private/i);
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
				onStart: (event) => events.push({ kind: "start", value: event }),
				onComplete: (event) => events.push({ kind: "complete", value: event }),
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
		}),
	).rejects.toThrow("configuration changed");
});

test("settings selection matches the new sales form's lowest active record", () => {
	expect(selectSalesRequestSettingId([4, 3])).toBe(3);
	expect(selectSalesRequestSettingId([3])).toBe(3);
});
