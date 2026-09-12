import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	SALES_REQUEST_AI_PROVIDER_CATALOG,
	type SalesRequestAIProvider,
} from "@gnd/settings";

describe("Sales Request AI settings", () => {
	test("offers every supported provider with provider-specific models", () => {
		expect(SALES_REQUEST_AI_PROVIDER_CATALOG.map(({ id }) => id)).toEqual([
			"openai",
			"anthropic",
			"deepseek",
			"google",
		]);

		for (const provider of SALES_REQUEST_AI_PROVIDER_CATALOG) {
			expect(provider.models.length).toBeGreaterThan(0);
			expect(provider.models.every((model) => model.id.length > 0)).toBe(true);
		}
	});

	test("keeps the supported provider union explicit", () => {
		const providers: SalesRequestAIProvider[] = [
			"openai",
			"anthropic",
			"deepseek",
			"google",
		];
		expect(providers).toHaveLength(4);
	});

	test("uses the server-backed query and mutation boundary", () => {
		const source = readFileSync(
			new URL("./sales-request-generation-settings-page.tsx", import.meta.url),
			"utf8",
		);
		expect(source).toContain("salesRequest.getAISettings.queryOptions()");
		expect(source).toContain("salesRequest.updateAISettings.mutationOptions");
		expect(source).toContain(
			"salesRequest.regenerateConfiguration.mutationOptions",
		);
		expect(source).toContain("salesRequest.setDefault.mutationOptions");
		expect(source).toContain("requestGeneration.routes");
		expect(source).toContain("No default");
		expect(source).toContain("dependency-ineligible");
		expect(source).toContain("queryClient.invalidateQueries");
		expect(source).toContain("This does not call the selected AI provider");
		expect(source).toContain("queryClient.setQueryData");
		expect(source).toContain("Provider credential is configured on the server");
		expect(source).toContain("!providerConfigured");
	});
});
