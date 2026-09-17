import { describe, expect, test } from "bun:test";
import type { Database } from "@gnd/db";
import {
	getAssistantProviderOptions,
	getAssistantRuntimeConfiguration,
} from "./runtime-settings";

function databaseWithSetting(
	setting: {
		provider: string;
		model: string;
		version: number;
		updatedAt: Date;
		updatedByUserId: number;
	} | null,
) {
	return {
		assistantRuntimeSetting: {
			findUnique: async () => setting,
		},
	} as unknown as Database;
}

describe("assistant runtime settings", () => {
	test("reports credential availability without returning credential values", () => {
		const providers = getAssistantProviderOptions({
			ASSISTANT_OPENAI_API_KEY: "secret-value-that-must-not-leak",
			SALES_REQUEST_DEEPSEEK_API_KEY: "sales-secret-that-must-not-leak",
			ASSISTANT_DISABLED_PROVIDERS: "openai, GOOGLE",
		});

		expect(
			providers.find((provider) => provider.id === "openai")?.configured,
		).toBe(true);
		expect(
			providers.find((provider) => provider.id === "deepseek")?.configured,
		).toBe(true);
		expect(
			providers.find((provider) => provider.id === "openai")?.enabled,
		).toBe(false);
		expect(
			providers.find((provider) => provider.id === "google")?.enabled,
		).toBe(false);
		expect(
			providers.find((provider) => provider.id === "deepseek")?.enabled,
		).toBe(true);
		expect(JSON.stringify(providers)).not.toContain(
			"secret-value-that-must-not-leak",
		);
		expect(JSON.stringify(providers)).not.toContain(
			"sales-secret-that-must-not-leak",
		);
	});

	test("uses a valid persisted provider selection instead of the environment default", async () => {
		const updatedAt = new Date("2026-09-14T12:00:00.000Z");
		const configuration = await getAssistantRuntimeConfiguration(
			databaseWithSetting({
				provider: "deepseek",
				model: "deepseek-flash",
				version: 3,
				updatedAt,
				updatedByUserId: 42,
			}),
			{
				ASSISTANT_AI_PROVIDER: "openai",
				ASSISTANT_AI_MODEL: "gpt-5-mini",
			},
		);

		expect(configuration).toEqual({
			selection: { provider: "deepseek", model: "deepseek-flash" },
			source: "persisted",
			version: 3,
			updatedAt,
			updatedByUserId: 42,
		});
	});

	test("falls back to the environment when a persisted selection is no longer valid", async () => {
		const configuration = await getAssistantRuntimeConfiguration(
			databaseWithSetting({
				provider: "deepseek",
				model: "retired-model",
				version: 4,
				updatedAt: new Date("2026-09-14T12:00:00.000Z"),
				updatedByUserId: 42,
			}),
			{
				ASSISTANT_AI_PROVIDER: "google",
				ASSISTANT_AI_MODEL: "gemini-2.5-flash",
			},
		);

		expect(configuration.selection).toEqual({
			provider: "google",
			model: "gemini-2.5-flash",
		});
		expect(configuration.source).toBe("invalid");
	});
});
