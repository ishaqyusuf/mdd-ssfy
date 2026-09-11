import { describe, expect, it } from "bun:test";

import {
	DEFAULT_SALES_REQUEST_AI_SELECTION,
	SALES_REQUEST_AI_PROVIDER_CATALOG,
	salesRequestAISelectionSchema,
} from "./sales-request-ai-catalog";
import {
	getSalesRequestAISettings,
	updateSalesRequestAISettings,
} from "./sales-request-ai-settings";

const settingId = 7;

function fakeDatabase(initialMeta: unknown) {
	let meta = initialMeta;
	let updateCount = 0;
	let transactionCount = 0;
	const events: string[] = [];
	const settings = {
		findFirst: async () => {
			events.push("read");
			return { id: settingId, meta };
		},
		update: async ({ data }: { data: { meta: unknown } }) => {
			events.push("update");
			updateCount += 1;
			meta = data.meta;
		},
	};
	const transactionClient = {
		$queryRaw: async () => {
			events.push("lock");
			return [{ id: settingId }];
		},
		settings,
	};
	const db = {
		settings,
		$transaction: async (
			callback: (tx: typeof transactionClient) => unknown,
			options: unknown,
		) => {
			transactionCount += 1;
			events.push("transaction");
			expect(options).toEqual({
				isolationLevel: "Serializable",
				timeout: 60_000,
			});
			return callback(transactionClient);
		},
	};

	return {
		db: db as unknown as Parameters<typeof updateSalesRequestAISettings>[0],
		getDb: db as unknown as Parameters<typeof getSalesRequestAISettings>[0],
		getMeta: () => meta,
		getEvents: () => events,
		getTransactionCount: () => transactionCount,
		getUpdateCount: () => updateCount,
	};
}

describe("sales request AI provider catalog", () => {
	it("exposes one strict model allowlist for all supported providers", () => {
		expect(
			SALES_REQUEST_AI_PROVIDER_CATALOG.map((provider) => provider.id),
		).toEqual(["openai", "anthropic", "deepseek", "google"]);
		for (const provider of SALES_REQUEST_AI_PROVIDER_CATALOG) {
			expect(
				provider.models.some((model) => model.id === provider.defaultModel),
			).toBe(true);
		}
	});

	it("rejects a model that belongs to a different provider", () => {
		expect(
			salesRequestAISelectionSchema.safeParse({
				provider: "google",
				model: "gpt-5.6-luna",
			}).success,
		).toBe(false);
	});
});

describe("persisted sales request AI settings", () => {
	it("uses the catalog's OpenAI default only when AI settings are absent", async () => {
		const fixture = fakeDatabase({ route: { preserved: true } });

		await expect(
			getSalesRequestAISettings(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			selection: DEFAULT_SALES_REQUEST_AI_SELECTION,
			source: "default",
		});
	});

	it("reads a valid persisted provider and model", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "google", model: "gemini-3.8-flash" },
			},
		});

		await expect(
			getSalesRequestAISettings(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			selection: { provider: "google", model: "gemini-3.8-flash" },
			source: "persisted",
		});
	});

	it("returns a repairable invalid state without treating it as persisted", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "google", model: "gpt-5.6-luna" },
			},
		});

		await expect(
			getSalesRequestAISettings(fixture.getDb, settingId),
		).resolves.toEqual({
			settingId,
			selection: DEFAULT_SALES_REQUEST_AI_SELECTION,
			source: "invalid",
		});
	});

	it("locks then deep-merges a validated selection without dropping metadata", async () => {
		const fixture = fakeDatabase({
			unrelated: { preserve: true },
			route: { exterior: { title: "Exterior" } },
			requestGeneration: { defaultsVersion: 3 },
		});

		const result = await updateSalesRequestAISettings(fixture.db, {
			settingId,
			provider: "anthropic",
			model: "claude-sonnet-5",
		});

		expect(result).toEqual({
			changed: true,
			settingId,
			selection: {
				provider: "anthropic",
				model: "claude-sonnet-5",
			},
			source: "persisted",
		});
		expect(fixture.getEvents()).toEqual([
			"transaction",
			"lock",
			"read",
			"update",
		]);
		expect(fixture.getMeta()).toEqual({
			unrelated: { preserve: true },
			route: { exterior: { title: "Exterior" } },
			requestGeneration: {
				defaultsVersion: 3,
				ai: { provider: "anthropic", model: "claude-sonnet-5" },
			},
		});
	});

	it("does not rewrite an identical persisted selection", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "deepseek", model: "deepseek-v4-flash" },
			},
		});

		const result = await updateSalesRequestAISettings(fixture.db, {
			settingId,
			provider: "deepseek",
			model: "deepseek-v4-flash",
		});

		expect(result.changed).toBe(false);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("lets an administrator replace an invalid legacy selection", async () => {
		const fixture = fakeDatabase({
			requestGeneration: {
				ai: { provider: "deepseek", model: "retired-model" },
			},
		});

		await expect(
			updateSalesRequestAISettings(fixture.db, {
				settingId,
				provider: "deepseek",
				model: "deepseek-v4-flash",
			}),
		).resolves.toMatchObject({ changed: true, source: "persisted" });
		expect(fixture.getMeta()).toEqual({
			requestGeneration: {
				ai: { provider: "deepseek", model: "deepseek-v4-flash" },
			},
		});
	});

	it("rejects invalid input before opening a transaction", async () => {
		const fixture = fakeDatabase({});

		await expect(
			updateSalesRequestAISettings(fixture.db, {
				settingId,
				provider: "openai",
				model: "deepseek-v4-flash",
			}),
		).rejects.toThrow();
		expect(fixture.getTransactionCount()).toBe(0);
	});
});
