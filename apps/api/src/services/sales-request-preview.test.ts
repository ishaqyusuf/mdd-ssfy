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
	aiSelection: { provider: "openai" as const, model: "gpt-5.6-luna" },
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
	const result = await createSalesRequestPreview(source, {
		authorize: async () => {},
		reserveUsage: async () => {},
		readSnapshot: async () => snapshot,
		createProvider: () => async () => ({ output }),
	});

	expect(result.seed).toEqual(output);
	expect(result.configurationRevision).toBe("one");
	expect(result.configurationScope).toBe("sales-settings:3");
	expect(result).not.toHaveProperty("draftPreparation");
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
