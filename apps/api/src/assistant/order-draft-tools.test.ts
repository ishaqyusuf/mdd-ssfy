import { describe, expect, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
import { createAssistantResultEnvelopeSchema } from "./contracts";
import { assistantToolRegistry } from "./registry";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { editOrders: true },
};

describe("Assistant Sales request draft tool", () => {
	test("activates the safe typed preview after the approval boundary lands", async () => {
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "sales_draft_from_request",
		);
		expect(definition).toMatchObject({
			capability: "implemented",
			effect: "draft",
			requiredGrants: ["editOrders"],
			presentation: { resultComponent: "order-draft" },
		});
		if (!definition?.handler) throw new Error("Draft preview handler missing");
		const signal = new AbortController().signal;
		let receivedSignal: AbortSignal | undefined;

		const raw = await definition.handler(
			actor,
			{ type: "order", text: "Two configured doors for delivery." },
			{
				draftSalesOrderFromRequest: async (_actor, _input, serviceSignal) => {
					receivedSignal = serviceSignal;
					return {
						type: "quote" as const,
						generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
						seed: NEW_SALES_FORM_SEED_EXAMPLE,
						configurationScope: "sales-settings:1",
						configurationRevision: "catalog-revision-4",
						promptVersion: "sales-request-v4",
						provider: "deepseek",
						model: "deepseek-chat",
						usage: { inputTokens: 420, outputTokens: 180 },
						unresolvedCount: 0,
					};
				},
			} as never,
			{ signal },
		);
		const result = createAssistantResultEnvelopeSchema(
			definition.outputSchema,
		).parse(raw);
		expect(result).toMatchObject({
			status: NEW_SALES_FORM_SEED_EXAMPLE.unresolved.length
				? "requires_input"
				: "success",
			data: {
				type: "order",
				unresolvedCount: NEW_SALES_FORM_SEED_EXAMPLE.unresolved.length,
				configurationRevision: "catalog-revision-4",
				seed: NEW_SALES_FORM_SEED_EXAMPLE,
				usage: { inputTokens: 420, outputTokens: 180 },
			},
			revision: "catalog-revision-4",
			sources: [{ kind: "record", label: "Published Sales configuration" }],
		});
		expect(receivedSignal).toBe(signal);
	});

	test("rejects empty or image-shaped input at the typed boundary", () => {
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "sales_draft_from_request",
		);
		expect(
			definition?.inputSchema.safeParse({ type: "order", text: "   " }).success,
		).toBe(false);
		expect(
			definition?.inputSchema.safeParse({
				type: "order",
				text: "Create this request",
				images: ["unreviewed-upload"],
			}).success,
		).toBe(false);
	});
});
